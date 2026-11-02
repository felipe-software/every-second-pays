#!/usr/bin/env python3
"""usage: run.py <reps> <bar> [<bar> ...]
Isolated jelly benchmark on a physical phone: one finger run is 4 press-drag-hold-release gestures, 2 landing on each page.
Bars alternate within each rep. Bars: native, reanimated; add :idle to measure the same screen with no finger. Prints medians of CPU (ms per second) and frame stats.
Env: BENCH_SERIAL, BENCH_OUT, BENCH_INSTALL=1 to install and compile the APK first, BENCH_LABEL to tag the saved JSON.
"""
import json, os, re, statistics as st, subprocess, sys, time

PKG = "software.felipe.everysecondpays.dev"
SERIAL = os.environ.get("BENCH_SERIAL", "swge8phybixgsk9t")
OUT = os.environ.get("BENCH_OUT", "/tmp/jelly-mac/bench")
LABEL = os.environ.get("BENCH_LABEL", "run")
ADB = [os.path.expanduser("~/Library/Android/sdk/platform-tools/adb"), "-s", SERIAL]
LEFT_X, RIGHT_X, Y, GESTURES = 190, 438, 2220, 4
LAUNCH_WAIT_SECONDS = 3.5
IDLE_SECONDS = 9
FINGER_JAR = "/data/local/tmp/jellyfinger.jar"
THREADS = {"main": "ysecondpays.dev", "render": "RenderThread", "js": "mqt_v_js"}
FRAME_KEYS = ("fps", "jank_pct", "p50", "p90", "p99")


def shell(cmd):
    return subprocess.run(ADB + ["shell", cmd], capture_output=True, text=True, errors="replace").stdout


def thread_cpu(pid):
    out = shell(f"cd /proc/{pid}/task && for t in *; do echo \"$(cat $t/comm)|$(cut -d' ' -f1 $t/schedstat)\"; done")
    times = {}
    for line in out.strip().splitlines():
        if "|" not in line:
            continue
        name, value = line.rsplit("|", 1)
        if value.strip().isdigit():
            times[name] = times.get(name, 0) + int(value)
    times["all"] = sum(times.values())
    return times


def frame_stats():
    out = shell(f"dumpsys gfxinfo {PKG}")
    def read(pattern):
        match = re.search(pattern, out)
        return int(match.group(1)) if match else 0
    return {
        "frames": read(r"Total frames rendered:\s*(\d+)"),
        "janky": read(r"Janky frames:\s*(\d+)"),
        "p50": read(r"50th percentile:\s*(\d+)ms"),
        "p90": read(r"90th percentile:\s*(\d+)ms"),
        "p99": read(r"99th percentile:\s*(\d+)ms"),
    }


def run_once(variant):
    bar, _, mode = variant.partition(":")
    shell(f"am force-stop {PKG}")
    shell(f"am start -a android.intent.action.VIEW -d 'everysecondpays-dev://bench?bar={bar}' {PKG} >/dev/null")
    time.sleep(LAUNCH_WAIT_SECONDS)
    pid = shell(f"pidof {PKG}").strip().split()[0]
    shell(f"dumpsys gfxinfo {PKG} reset >/dev/null")
    before = thread_cpu(pid)
    started = time.time()
    if mode == "idle":
        time.sleep(IDLE_SECONDS)
    else:
        shell(f"CLASSPATH={FINGER_JAR} app_process / JellyFinger {LEFT_X} {RIGHT_X} {Y} {GESTURES}")
    seconds = time.time() - started
    after = thread_cpu(pid)
    frames = frame_stats()
    alive = shell(f"pidof {PKG}").strip() == pid
    result = {"seconds": round(seconds, 2), "alive": alive, "frames": frames["frames"], "janky": frames["janky"]}
    result["fps"] = round(frames["frames"] / seconds, 1)
    result["jank_pct"] = round(100 * frames["janky"] / max(frames["frames"], 1), 1)
    for key in ("p50", "p90", "p99"):
        result[key] = frames[key]
    for key, name in THREADS.items():
        result[key] = round((after.get(name, 0) - before.get(name, 0)) / 1e6 / seconds, 1)
    result["all"] = round((after["all"] - before["all"]) / 1e6 / seconds, 1)
    return result


def main():
    reps = int(sys.argv[1])
    bars = sys.argv[2:]
    if os.environ.get("BENCH_INSTALL") == "1":
        print(subprocess.run(ADB + ["install", "-r", f"{OUT}/bench.apk"], capture_output=True, text=True).stdout.strip().splitlines()[-1], flush=True)
        subprocess.run(ADB + ["push", f"{OUT}/jellyfinger.jar", FINGER_JAR], capture_output=True)
        print("compile:", shell(f"cmd package compile -m speed -f {PKG}").strip()[:40], flush=True)
    results = {bar: [] for bar in bars}
    started = time.time()
    for rep in range(reps):
        for bar in bars:
            result = run_once(bar)
            results[bar].append(result)
            print(f"r{rep} {bar:11}", {k: result[k] for k in ("alive", "frames", "fps", "jank_pct", "p90", "p99", "main", "render", "js", "all")}, flush=True)
    print(f"--- {reps} reps in {time.time() - started:.0f}s, temp {shell('dumpsys battery | grep temperature').strip()}")
    columns = FRAME_KEYS + ("main", "render", "js", "all")
    print(f"{'bar':12}" + "".join(f"{c:>9}" for c in columns))
    for bar in bars:
        print(f"{bar:12}" + "".join(f"{st.median(r[c] for r in results[bar]):9.1f}" for c in columns))
    with open(f"{OUT}/{LABEL}.json", "w") as handle:
        json.dump(results, handle, indent=1)


main()
