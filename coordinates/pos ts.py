#!/usr/bin/env python3
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
import os
import sys

def load_cam0_positions(filename="cam0_100-200.npy"):
    if not os.path.exists(filename):
        raise FileNotFoundError(f"{filename} not found.")
    return np.load(filename, allow_pickle=True).tolist()

def animate_trajectory(positions,
                       interval=100,
                       trail_length=None,
                       trim_start=0,
                       trim_end=None,
                       global_margin=0.05):
    """
    positions      : full list of (x, y) tuples
    interval       : ms between frames
    trail_length   : how many past points to show (None = all)
    trim_start     : index of first frame to include in animation
    trim_end       : index one-past-the-last frame to include (None = to end)
    global_margin  : fraction of total data range to pad axes by
    """
    total = len(positions)
    trim_end = total if trim_end is None else min(trim_end, total)
    pos = positions[trim_start:trim_end]
    if not pos:
        raise ValueError("Trim range yields no data points.")
    
    # Split the trimmed sequence for animation
    xs, ys = zip(*pos)

    # But compute bounds on the **entire** dataset
    all_xs, all_ys = zip(*positions)
    xmin, xmax = min(all_xs), max(all_xs)
    ymin, ymax = min(all_ys), max(all_ys)
    dx, dy = xmax - xmin, ymax - ymin
    pad_x = dx * global_margin if dx > 0 else 1
    pad_y = dy * global_margin if dy > 0 else 1

    fig, ax = plt.subplots(figsize=(10,10))
    ax.set_title("Camera 0 Shooter Trajectory")
    ax.set_xlabel("World X")
    ax.set_ylabel("World Y")
    ax.grid(True)
    ax.axis('equal')

    # Fix axes to full-data bounds
    ax.set_xlim(xmin - pad_x, xmax + pad_x)
    ax.set_ylim(ymin - pad_y, ymax + pad_y)

    # First, plot the complete path as a static line
    full_path, = ax.plot(xs, ys, 'b-', lw=1, alpha=0.3)
    
    # Point, trail, and frame counter
    point, = ax.plot([], [], 'ro', ms=8)
    trail, = ax.plot([], [], 'r-', lw=2)
    frame_txt = ax.text(0.02, 0.95, '', transform=ax.transAxes,
                        fontsize=12, color='blue')

    def init():
        point.set_data([], [])
        trail.set_data([], [])
        frame_txt.set_text('')
        return point, trail, frame_txt

    def update(i):
        x, y = xs[i], ys[i]
        point.set_data([x], [y])
        # Always show the full path up to the current point
        trail.set_data(xs[0:i+1], ys[0:i+1])
        frame_txt.set_text(f"Frame: {trim_start + i}")
        return point, trail, frame_txt

    return animation.FuncAnimation(
        fig, update, frames=len(xs),
        init_func=init, blit=True, interval=interval
    )

if __name__ == "__main__":
    # Usage: python anim_cam0.py [interval_ms] [trail_len] [trim_start] [trim_end] [pad_frac]
    args = sys.argv[1:]
    interval      = int(args[0]) if len(args) > 0 else 100
    # Force trail to always be None (show all points)
    trail         = None
    trim_start    = int(args[2]) if len(args) > 2 else 0
    trim_end      = int(args[3]) if len(args) > 3 else None
    global_margin = float(args[4]) if len(args) > 4 else 0.05

    positions = load_cam0_positions()
    ani = animate_trajectory(
        positions,
        interval=interval,
        trail_length=trail,
        trim_start=trim_start,
        trim_end=trim_end,
        global_margin=global_margin
    )
    plt.show()
