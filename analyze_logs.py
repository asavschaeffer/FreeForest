# analyze_logs.py - Script to analyze exported game logs

import json
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import os
from datetime import datetime

print("Starting log analysis...")

# Check if game_logs.json exists
if not os.path.exists('game_logs.json'):
    print("Error: game_logs.json not found. Please play the game and export logs by pressing 'E' first.")
    exit(1)

# Load the JSON file
print("Loading game logs...")
with open('game_logs.json', 'r') as f:
    logs = json.load(f)

print(f"Loaded {len(logs)} log entries")

# Convert to DataFrame
df = pd.json_normalize(logs)

# Create output directory for results
os.makedirs('analysis_results', exist_ok=True)

# ------------------- Basic Statistics -------------------
print("\nGenerating basic statistics...")

# Count events by type
event_counts = df['event_type'].value_counts()
print("\nEvent type counts:")
print(event_counts)

# Count entities by type
entity_counts = df['entity_type'].value_counts()
print("\nEntity type counts:")
print(entity_counts)

# Calculate game session duration
if len(df) > 0:
    try:
        df['time_parsed'] = pd.to_datetime(df['time'])
        start_time = df['time_parsed'].min()
        end_time = df['time_parsed'].max()
        duration = end_time - start_time
        print(f"\nGame session duration: {duration}")
        
        # Get frame range
        min_frame = df['frame'].min()
        max_frame = df['frame'].max()
        print(f"Frames: {min_frame} to {max_frame} ({max_frame - min_frame + 1} total)")
    except Exception as e:
        print(f"Could not calculate time statistics: {e}")

# ------------------- Property Path Extraction: Player Position -------------------
print("\nAnalyzing player position data...")

# Check if player position data exists
player_x_changes = df[df['property_path'] == 'player.x']
player_y_changes = df[df['property_path'] == 'player.y']

if len(player_x_changes) > 0 and len(player_y_changes) > 0:
    # Extract x and y position data
    plt.figure(figsize=(10, 6))
    plt.plot(player_x_changes['frame'], player_x_changes['new_value'].astype(float), label='X Position')
    plt.plot(player_y_changes['frame'], player_y_changes['new_value'].astype(float), label='Y Position')
    plt.xlabel('Frame')
    plt.ylabel('Position')
    plt.title('Player Position Over Time')
    plt.legend()
    plt.grid(True)
    plt.savefig('analysis_results/player_position.png')
    plt.close()
    print("  Player position chart saved to analysis_results/player_position.png")
    
    # Create heatmap of player positions (2D histogram)
    try:
        positions_df = pd.DataFrame({
            'x': player_x_changes['new_value'].astype(float).tolist(),
            'y': player_y_changes['new_value'].astype(float).tolist()
        })
        
        plt.figure(figsize=(8, 8))
        plt.hist2d(positions_df['x'], positions_df['y'], bins=30, cmap='hot')
        plt.colorbar(label='Frequency')
        plt.xlabel('X Position')
        plt.ylabel('Y Position')
        plt.title('Player Position Heatmap')
        plt.tight_layout()
        plt.savefig('analysis_results/player_position_heatmap.png')
        plt.close()
        print("  Player position heatmap saved to analysis_results/player_position_heatmap.png")
    except Exception as e:
        print(f"  Could not generate position heatmap: {e}")
else:
    print("  No player position data found")

# ------------------- Anomaly Detection: Rapid Key Presses -------------------
print("\nAnalyzing key press patterns...")

# Filter key press events
key_presses = df[df['event_type'] == 'key_press']

if len(key_presses) > 0:
    # Convert time to datetime for calculating time differences
    key_presses['time_datetime'] = pd.to_datetime(key_presses['time'])
    key_presses['time_float'] = key_presses['time_datetime'].astype(int) / 10**9
    
    # Create a new column with time differences
    time_diffs = key_presses['time_float'].diff().dropna()
    
    if len(time_diffs) > 0:
        mean_diff = time_diffs.mean()
        std_diff = time_diffs.std()
        
        # Define anomalies as key presses that are much faster than average (2 standard deviations below mean)
        anomalies = time_diffs[time_diffs < mean_diff - 2 * std_diff]
        
        print(f"  Average time between key presses: {mean_diff:.3f} seconds")
        print(f"  Standard deviation: {std_diff:.3f} seconds")
        print(f"  Found {len(anomalies)} anomalous (rapid) key press intervals")
        
        if len(anomalies) > 0:
            print("  Anomalous key press intervals (seconds):", anomalies.tolist())
            
            # Plot histogram of time differences between key presses
            plt.figure(figsize=(10, 6))
            plt.hist(time_diffs, bins=30, alpha=0.7, label='Normal')
            if len(anomalies) > 0:
                plt.hist(anomalies, bins=10, alpha=0.7, label='Anomalies', color='red')
            plt.axvline(mean_diff, color='k', linestyle='dashed', alpha=0.3, label=f'Mean ({mean_diff:.3f}s)')
            plt.axvline(mean_diff - 2 * std_diff, color='r', linestyle='dashed', alpha=0.3, 
                      label=f'Threshold ({(mean_diff - 2 * std_diff):.3f}s)')
            plt.title('Distribution of Time Between Key Presses')
            plt.xlabel('Time (seconds)')
            plt.ylabel('Frequency')
            plt.legend()
            plt.savefig('analysis_results/key_press_intervals.png')
            plt.close()
            print("  Key press interval histogram saved to analysis_results/key_press_intervals.png")
    else:
        print("  Not enough key press data to detect anomalies")
else:
    print("  No key press data found")
    
# ------------------- Entity Analysis -------------------
print("\nAnalyzing entity statistics...")

# Count entity additions by type
entity_additions = df[df['event_type'] == 'entity_added']
if len(entity_additions) > 0:
    entity_type_counts = entity_additions['entity_type'].value_counts()
    print("\nEntities created by type:")
    print(entity_type_counts)
    
    # Plot entity creation over time
    plt.figure(figsize=(10, 6))
    entity_additions.groupby(['entity_type', 'frame']).size().unstack(0).cumsum().plot()
    plt.xlabel('Frame')
    plt.ylabel('Cumulative Count')
    plt.title('Entity Creation Over Time')
    plt.grid(True)
    plt.tight_layout()
    plt.savefig('analysis_results/entity_creation.png')
    plt.close()
    print("  Entity creation chart saved to analysis_results/entity_creation.png")
else:
    print("  No entity addition data found")

# ------------------- Generate Summary Report -------------------
print("\nGenerating summary report...")

# Create a summary report
with open('analysis_results/report.txt', 'w') as f:
    f.write(f"Game Log Analysis Report\n")
    f.write(f"======================\n\n")
    f.write(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
    
    f.write(f"Statistics:\n")
    f.write(f"----------\n")
    f.write(f"Total log entries: {len(logs)}\n")
    
    if len(df) > 0:
        try:
            f.write(f"Game session duration: {duration}\n")
            f.write(f"Frames: {min_frame} to {max_frame} ({max_frame - min_frame + 1} total)\n\n")
        except:
            f.write("Could not calculate time statistics\n\n")
    
    f.write(f"Event type counts:\n")
    for event_type, count in event_counts.items():
        f.write(f"  {event_type}: {count}\n")
    f.write("\n")
    
    f.write(f"Entity type counts:\n")
    for entity_type, count in entity_counts.items():
        f.write(f"  {entity_type}: {count}\n")
    f.write("\n")
    
    if len(key_presses) > 0 and len(time_diffs) > 0:
        f.write(f"Key press analysis:\n")
        f.write(f"  Total key presses: {len(key_presses)}\n")
        f.write(f"  Average time between key presses: {mean_diff:.3f} seconds\n")
        f.write(f"  Standard deviation: {std_diff:.3f} seconds\n")
        f.write(f"  Anomalous (rapid) key press intervals detected: {len(anomalies)}\n\n")
    
    f.write(f"Files generated:\n")
    f.write(f"---------------\n")
    f.write(f"  - analysis_results/player_position.png\n")
    f.write(f"  - analysis_results/player_position_heatmap.png\n")
    f.write(f"  - analysis_results/key_press_intervals.png\n")
    f.write(f"  - analysis_results/entity_creation.png\n")

print(f"Analysis complete! Results saved to the analysis_results directory.")
print(f"Summary report written to analysis_results/report.txt")
