#!/usr/bin/env python3
"""
Usage:
    python run_feature_engineering.py --file datasets/product_data.csv
    python run_feature_engineering.py --folder datasets/
    python run_feature_engineering.py --all
"""

import argparse
from pathlib import Path
import sys
sys.path.append(str(Path(__file__).parent.parent))
from app.core.feature_engineering import feature_engineer
from app.config import settings

def process_single_file(file_path: Path):
    print(f"\n📂 Processing: {file_path}")
    result = feature_engineer.process_file(file_path)
    
    if result['status'] == 'success':
        print(f"✅ Success!")
        print(f"   Processed: {result['processed_file']}")
        print(f"   Shape: {result['featured_shape']}")
        print(f"   Features created: {len(result['features_created'])}")
    else:
        print(f"❌ Failed: {result['validation']['errors']}")
    
    return result

def main():
    parser = argparse.ArgumentParser(description='Feature Engineering Pipeline')
    parser.add_argument('--file', type=str, help='Single file to process')
    parser.add_argument('--folder', type=str, help='Process all files in folder')
    parser.add_argument('--all', action='store_true', help='Process all raw files')
    args = parser.parse_args()
    
    if args.file:
        process_single_file(Path(args.file))
    
    elif args.folder:
        folder = Path(args.folder)
        for file in folder.glob('*.*'):
            if file.suffix in ['.csv', '.xlsx', '.json']:
                process_single_file(file)
    
    elif args.all:
        for file in settings.RAW_DATA_DIR.glob('*.*'):
            if file.suffix in ['.csv', '.xlsx', '.json']:
                process_single_file(file)
    
    else:
        print("Please specify --file, --folder, or --all")

if __name__ == "__main__":
    main()