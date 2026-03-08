AKShare 启动说明

1) 安装 Python（3.10+）后，在项目目录执行：
   pip install -r requirements-akshare.txt

2) 启动服务：
   双击 start-akshare.bat
   或命令行运行：python akshare_server.py

3) 打开页面：
   http://127.0.0.1:8899

说明：
- 前端已优先使用 AKShare 本地接口（8899 端口）
- 若 AKShare 不可用，才会回退到其他数据源
