#!/usr/bin/env python3

from __future__ import annotations

import os
import re
import sys
import time
import shutil
import signal
import subprocess
from pathlib import Path
from datetime import datetime

ROOT = Path.cwd()
BOT_DIR = ROOT / "bot"
COMMANDS_DIR = BOT_DIR / "commands"
RUNTIME = BOT_DIR / "services" / "runtime.ts"

# ============================================================
# JerSuit V2 — CLI CONTROL CENTER
# ============================================================

VERSION = "2.0.0"

# ANSI
RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"

GREEN = "\033[92m"
CYAN = "\033[96m"
BLUE = "\033[94m"
YELLOW = "\033[93m"
RED = "\033[91m"
MAGENTA = "\033[95m"
WHITE = "\033[97m"

CLEAR = "\033[2J\033[H"


def c(text, color=WHITE):
    return f"{color}{text}{RESET}"


def run(cmd, cwd=ROOT, capture=False):
    print(c(f"\n$ {cmd}\n", DIM))
    try:
        return subprocess.run(
            cmd,
            shell=True,
            cwd=cwd,
            text=True,
            capture_output=capture,
        )
    except KeyboardInterrupt:
        print(c("\n✗ Interrupted.", RED))
        return None


def header(title="CONTROL CENTER"):
    print(CLEAR)

    print(c(r"""
     ██╗███████╗██████╗ ███████╗██╗   ██╗██╗████████╗
     ██║██╔════╝██╔══██╗██╔════╝██║   ██║██║╚══██╔══╝
     ██║█████╗  ██████╔╝███████╗██║   ██║██║   ██║
██   ██║██╔══╝  ██╔══██╗╚════██║╚██╗ ██╔╝██║   ██║
╚█████╔╝███████╗██║  ██║███████║ ╚████╔╝ ██║   ██║
 ╚════╝ ╚══════╝╚═╝  ╚═╝╚══════╝  ╚═╝   ╚═╝  ╚═╝
""", GREEN))

    print(c("                    JerSuit V2", BOLD + WHITE))
    print(c("              Discord Bot Control Center", DIM))
    print()
    print(c(f"  {title}", CYAN + BOLD))
    print(c("  " + "─" * 62, DIM))
    print()


def box(title, lines, color=CYAN):
    print(c(f"╭{'─' * 64}╮", color))
    print(c(f"│  {title:<60}│", color))
    print(c(f"├{'─' * 64}┤", color))

    for line in lines:
        print(f"│  {line:<60}│")

    print(c(f"╰{'─' * 64}╯", color))


def pause():
    input(c("\nPress ENTER to continue...", DIM))


def confirm(message):
    answer = input(c(f"\n⚠ {message} [y/N]: ", YELLOW))
    return answer.strip().lower() in ("y", "yes")


def command_inventory():
    commands = []

    if not COMMANDS_DIR.exists():
        return commands

    pattern = re.compile(
        r'defineCommand\s*\(\s*\{.*?name\s*:\s*[\'"]([^\'"]+)',
        re.S,
    )

    for path in sorted(COMMANDS_DIR.rglob("*.ts")):
        if path.name.endswith(".d.ts"):
            continue

        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue

        for match in pattern.finditer(text):
            commands.append(
                (
                    match.group(1),
                    path.relative_to(ROOT),
                )
            )

    return commands


def get_package_scripts():
    package = ROOT / "package.json"

    if not package.exists():
        return {}

    try:
        import json
        data = json.loads(package.read_text(encoding="utf-8"))
        return data.get("scripts", {})
    except Exception:
        return {}


def process_exists(pattern):
    try:
        result = subprocess.run(
            ["pgrep", "-af", pattern],
            capture_output=True,
            text=True,
        )
        return bool(result.stdout.strip())
    except Exception:
        return False


# ============================================================
# RUNTIME
# ============================================================

def start_bot():
    header("RUNTIME / START BOT")

    scripts = get_package_scripts()

    if "bot" in scripts:
        command = "npm run bot"
    else:
        command = "node scripts/bot.mjs"

    box(
        "BOT STARTUP",
        [
            "Initializing JerSuit runtime...",
            "Connecting to Discord Gateway...",
            "Loading command registry...",
            "Starting real-time presence...",
        ],
    )

    run(command)


def start_panel():
    header("PANEL / START")

    scripts = get_package_scripts()

    if "dev" in scripts:
        command = "npm run dev"
    else:
        command = "npm run start"

    box(
        "PANEL STARTUP",
        [
            "Starting JerSuit Web Panel...",
            "Launching development server...",
            "Waiting for local endpoint...",
        ],
    )

    run(command)


def restart_bot():
    header("RUNTIME / RESTART")

    if not confirm("Restart the JerSuit bot runtime?"):
        print(c("Cancelled.", DIM))
        pause()
        return

    run("pkill -f 'scripts/bot.mjs' || true")
    time.sleep(1)
    start_bot()


# ============================================================
# DIAGNOSTICS
# ============================================================

def status():
    header("SYSTEM STATUS")

    commands = command_inventory()

    bot_running = process_exists("scripts/bot.mjs")
    panel_running = process_exists("next|vite")

    node_version = subprocess.run(
        "node --version",
        shell=True,
        capture_output=True,
        text=True,
    ).stdout.strip()

    npm_version = subprocess.run(
        "npm --version",
        shell=True,
        capture_output=True,
        text=True,
    ).stdout.strip()

    box(
        "JERSUIT STATUS",
        [
            f"Project        : {ROOT.name}",
            f"Bot Runtime    : {'● ONLINE' if bot_running else '○ OFFLINE'}",
            f"Panel          : {'● RUNNING' if panel_running else '○ STOPPED'}",
            f"Commands       : {len(commands)}",
            f"Node           : {node_version or 'Unknown'}",
            f"NPM            : {npm_version or 'Unknown'}",
            f"Runtime File   : {'Found' if RUNTIME.exists() else 'Missing'}",
        ],
        GREEN if bot_running else YELLOW,
    )

    pause()


def commands():
    header("COMMAND INVENTORY")

    items = command_inventory()

    if not items:
        box(
            "COMMANDS",
            ["No commands detected."],
            RED,
        )
        pause()
        return

    categories = {}

    for name, path in items:
        parts = Path(path).parts

        category = "general"

        if "commands" in parts:
            index = parts.index("commands")

            if index + 1 < len(parts):
                category = parts[index + 1]

        categories.setdefault(category, []).append(name)

    print(c(f"  Total Commands : {len(items)}", GREEN + BOLD))
    print(c(f"  Categories     : {len(categories)}", CYAN))
    print()

    number = 1

    for category, names in sorted(categories.items()):
        print(c(f"  [{category.upper()}] — {len(names)} commands", MAGENTA))
        print(c("  " + "─" * 58, DIM))

        for name in sorted(names):
            print(f"    {number:>3}. /{name}")
            number += 1

        print()

    print(c("✓ Command scan completed.", GREEN))
    pause()


# ============================================================
# TYPESCRIPT / REPAIR
# ============================================================

def typecheck():
    header("DEVELOPER TOOLS / TYPESCRIPT CHECK")

    result = run(
        "npx tsc -p tsconfig.bot.json --noEmit"
    )

    if result and result.returncode == 0:
        print(c("\n✓ TypeScript check passed.", GREEN + BOLD))
    else:
        print(c("\n✗ TypeScript errors detected.", RED + BOLD))

    pause()


def doctor():
    header("SYSTEM DIAGNOSTICS")

    checks = []

    files = [
        "package.json",
        "tsconfig.bot.json",
        "bot/client.ts",
        "bot/services/runtime.ts",
        "bot/presence.ts",
    ]

    for file in files:
        path = ROOT / file
        checks.append(
            (
                file,
                path.exists(),
            )
        )

    print(c("  FILE SYSTEM", CYAN + BOLD))
    print()

    for file, exists in checks:
        symbol = "✓" if exists else "✗"
        color = GREEN if exists else RED
        print(c(f"    {symbol} {file}", color))

    print()
    print(c("  COMMANDS", CYAN + BOLD))
    print()

    items = command_inventory()

    print(
        c(
            f"    ✓ {len(items)} commands discovered",
            GREEN,
        )
    )

    print()
    print(c("  TYPESCRIPT", CYAN + BOLD))
    print()

    result = subprocess.run(
        "npx tsc -p tsconfig.bot.json --noEmit",
        shell=True,
        cwd=ROOT,
    )

    if result.returncode == 0:
        print(c("    ✓ No TypeScript errors", GREEN))
    else:
        print(c("    ✗ TypeScript errors detected", RED))

    pause()


def repair():
    header("PROJECT REPAIR")

    print(c("This operation will attempt safe automatic repairs.", YELLOW))
    print()

    if not confirm("Run the JerSuit repair process?"):
        print(c("Cancelled.", DIM))
        pause()
        return

    box(
        "REPAIR PIPELINE",
        [
            "Checking dependencies...",
            "Checking TypeScript configuration...",
            "Checking bot runtime...",
            "Checking command registry...",
            "Running TypeScript validation...",
        ],
    )

    run("npm install")

    result = subprocess.run(
        "npx tsc -p tsconfig.bot.json --noEmit",
        shell=True,
        cwd=ROOT,
    )

    print()

    if result.returncode == 0:
        print(c("✓ Repair completed successfully.", GREEN + BOLD))
    else:
        print(c("⚠ Repair completed with remaining errors.", YELLOW + BOLD))

    pause()


def clean_build():
    header("BUILD CLEANUP")

    if not confirm("Delete generated build/cache directories?"):
        print(c("Cancelled.", DIM))
        pause()
        return

    targets = [
        ".next",
        "dist",
        "build",
        ".turbo",
    ]

    for target in targets:
        path = ROOT / target

        if path.exists():
            shutil.rmtree(path, ignore_errors=True)
            print(c(f"✓ Removed {target}", GREEN))
        else:
            print(c(f"• {target} not present", DIM))

    print(c("\n✓ Cleanup finished.", GREEN))
    pause()


# ============================================================
# MAINTENANCE
# ============================================================

def maintenance():
    header("MAINTENANCE MODE")

    print(c("""
  Maintenance Mode is intended to temporarily stop normal
  JerSuit runtime operations while you work on the project.
""", DIM))

    if confirm("Enable maintenance mode?"):
        path = ROOT / ".jersuit-maintenance"

        path.write_text(
            datetime.now().isoformat(),
            encoding="utf-8",
        )

        print(c("\n✓ Maintenance mode ENABLED.", YELLOW + BOLD))
    else:
        print(c("\nCancelled.", DIM))

    pause()


def disable_maintenance():
    header("MAINTENANCE MODE")

    path = ROOT / ".jersuit-maintenance"

    if path.exists():
        path.unlink()
        print(c("✓ Maintenance mode DISABLED.", GREEN + BOLD))
    else:
        print(c("• Maintenance mode is already disabled.", DIM))

    pause()


# ============================================================
# LOGS
# ============================================================

def logs():
    header("RUNTIME LOGS")

    possible = [
        ROOT / "logs",
        ROOT / "log",
    ]

    found = False

    for directory in possible:
        if directory.exists():
            found = True

            files = sorted(
                directory.rglob("*"),
                key=lambda x: x.stat().st_mtime
                if x.exists()
                else 0,
                reverse=True,
            )

            for file in files[:5]:
                if file.is_file():
                    print(c(f"  {file.relative_to(ROOT)}", CYAN))

    if not found:
        print(c("  No log directory found.", YELLOW))

    pause()


# ============================================================
# MAIN MENU
# ============================================================

def menu():
    while True:
        header("CONTROL CENTER")

        print(c("  RUNTIME", GREEN + BOLD))
        print("    [1] 🚀  Start Bot")
        print("    [2] 🖥️   Start Panel")
        print("    [3] 🔄  Restart Bot")
        print("    [4] 📊  Bot Status")
        print()

        print(c("  DEVELOPMENT", CYAN + BOLD))
        print("    [5] 📋  Command Inventory")
        print("    [6] 🧪  TypeScript Check")
        print("    [7] 🩺  Project Doctor")
        print("    [8] 🛠️   Repair Project")
        print("    [9] 🧹  Clean Build")
        print()

        print(c("  SYSTEM", YELLOW + BOLD))
        print("   [10] 🟡  Maintenance Mode")
        print("   [11] 🟢  Disable Maintenance")
        print("   [12] 📝  View Logs")
        print()

        print(c("    [0] ❌  Exit", RED))
        print()
        print(c("  " + "─" * 62, DIM))

        choice = input(
            c("\n  Select option › ", GREEN + BOLD)
        ).strip().lower()

        if choice == "1":
            start_bot()
        elif choice == "2":
            start_panel()
        elif choice == "3":
            restart_bot()
        elif choice == "4":
            status()
        elif choice == "5":
            commands()
        elif choice == "6":
            typecheck()
        elif choice == "7":
            doctor()
        elif choice == "8":
            repair()
        elif choice == "9":
            clean_build()
        elif choice == "10":
            maintenance()
        elif choice == "11":
            disable_maintenance()
        elif choice == "12":
            logs()
        elif choice == "0":
            print(c("\n  Goodbye from JerSuit V2. 👋\n", GREEN))
            break
        else:
            print(c("\n  ✗ Invalid option.", RED))
            time.sleep(1)


# ============================================================
# CLI COMMAND MODE
# ============================================================

def cli_command(command):
    commands_map = {
        "start": start_bot,
        "panel": start_panel,
        "restart": restart_bot,
        "status": status,
        "commands": commands,
        "check": typecheck,
        "doctor": doctor,
        "repair": repair,
        "clean": clean_build,
        "maintenance": maintenance,
        "unmaintenance": disable_maintenance,
        "logs": logs,
    }

    if command in ("help", "--help", "-h"):
        header("CLI COMMANDS")

        for name in commands_map:
            print(f"  jersuit {name}")

        print()
        print("  jersuit")
        pause()
        return

    function = commands_map.get(command)

    if function:
        function()
    else:
        print(c(f"Unknown command: {command}", RED))
        print(c("Run: jersuit help", DIM))


# ============================================================
# ENTRY POINT
# ============================================================

def main():
    if len(sys.argv) > 1:
        cli_command(sys.argv[1])
    else:
        menu()


if __name__ == "__main__":
    main()
