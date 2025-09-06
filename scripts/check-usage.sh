#!/bin/bash

# 查看 R2 存储使用情况
echo "=== R2 存储使用情况 ==="
wrangler r2 object list image-bed --limit 100

# 查看 Worker 分析数据
echo "=== Worker 访问统计 ==="
echo "请访问 Cloudflare Dashboard 查看详细分析数据"
echo "路径：Workers & Pages → image-bed-worker → Analytics"

# 查看 Pages 访问统计  
echo "=== Pages 访问统计 ==="
echo "请访问 Cloudflare Dashboard 查看详细分析数据"
echo "路径：Pages → image-bed-frontend → Analytics"