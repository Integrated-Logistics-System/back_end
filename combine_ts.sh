#!/bin/bash

# 출력 파일명 설정 (현재 날짜와 시간 포함)
OUTPUT_FILE="typescript_files_$(date +%Y%m%d_%H%M%S).txt"

# 파일 헤더 추가
echo "=== TypeScript Files Combined on $(date) ===" > "$OUTPUT_FILE"
echo "=======================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# src 디렉토리에서 모든 .ts 파일 찾기 (node_modules 제외)
find src -type f -name "*.ts" -not -path "*/node_modules/*" | while read -r file; do
    # 파일 구분자 추가
    echo -e "\n\n" >> "$OUTPUT_FILE"
    echo "=== File: $file ===" >> "$OUTPUT_FILE"
    echo "=======================================" >> "$OUTPUT_FILE"
    
    # 파일 내용 추가
    cat "$file" >> "$OUTPUT_FILE"
done

echo "모든 TypeScript 파일이 $OUTPUT_FILE 로 병합되었습니다."