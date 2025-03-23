This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
2. 部署到服务器
以下是部署到 ​Ubuntu 22.04 服务器的步骤。

​步骤 1：准备服务器
更新系统：
sudo apt update
sudo apt upgrade -y
安装 Git：
sudo apt install git -y
克隆你的项目：
git clone <your-repo-url>
cd <your-project-folder>
​步骤 2：安装 Node.js 18
添加 NodeSource 仓库：
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
安装 Node.js：
sudo apt install nodejs -y
验证安装：
node -v  # 检查 Node.js 版本（应为 v18.x）
npm -v   # 检查 npm 版本
​步骤 3：安装项目依赖
安装依赖：
npm install
构建项目：
npm run build
​步骤 4：使用 PM2 管理进程
安装 PM2：
sudo npm install -g pm2
启动应用：
pm2 start npm --name "next-app" -- start
设置开机启动：
pm2 startup
pm2 save
​步骤 5：配置 Nginx 反向代理
安装 Nginx：
sudo apt install nginx -y
编辑 Nginx 配置文件：
sudo nano /etc/nginx/sites-available/default
替换为以下内容：
server {
    listen 80;
    server_name yourdomain.com;  # 替换为你的域名或服务器 IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
测试并重启 Nginx：
sudo nginx -t
sudo systemctl restart nginx
​步骤 6：配置防火墙
启用防火墙：
sudo ufw enable
放行端口：
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
查看防火墙状态：
sudo ufw status
​步骤 7：配置域名和 SSL（可选）​
安装 Certbot：
sudo apt install certbot python3-certbot-nginx -y
获取 SSL 证书：
bash
sudo certbot --nginx -d yourdomain.com
测试自动续期：
bash
sudo certbot renew --dry-run
​步骤 8：访问项目
通过域名访问：http://yourdomain.com
通过 IP 访问：http://<服务器IP>
