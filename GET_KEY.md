请复制以下命令到终端执行，然后告诉我输出的内容：

```
cat << 'EOF' > /tmp/private.key
-----BEGIN RSA PRIVATE KEY-----
粘贴你的私钥内容到这里
-----END RSA PRIVATE KEY-----
EOF
echo "已保存到 /tmp/private.key"
```

或者更简单 - 直接把私钥内容保存到一个txt文件，然后告诉我文件路径。
