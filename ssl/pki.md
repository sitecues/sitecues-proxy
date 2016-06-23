# Create a PKI chain

> Root CA => Intermediate CA => Server

Set up the directory structure for the root CA.

```sh
mkdir root-ca;
cd root-ca;
mkdir private cert crl newcert;
chmod 700 private;
touch index.txt;
echo 1000 > serial;
```

Create a config file for the root CA. For example:
https://jamielinux.com/docs/openssl-certificate-authority/_downloads/root-config.txt

```sh
nano openssl.conf;
```

Create a private key for the root CA.

```sh
openssl genrsa -aes256 -out private/ca.key.pem 4096;
chmod 400 private/ca.key.pem;
```

Create a self-signed public certificate for the root CA.

```sh
openssl req -config openssl.conf \
      -new -x509 -days 7300 -sha512 -extensions v3_ca \
      -key private/ca.key.pem \
      -out cert/ca.cert.pem;
chmod 444 cert/ca.cert.pem;
```

Check the root CA's public certificate details.

```sh
openssl x509 -noout -text -in cert/ca.cert.pem;
```

Set up the directory structure for the intermediate CA.

```sh
mkdir ../intermediate-ca;
cd ../intermediate-ca;
mkdir private csr cert crl newcert;
chmod 700 private;
touch index.txt;
echo 1000 > serial;
echo 1000 > crlnumber;
```

Create a config file for the intermediate CA. For example:
https://jamielinux.com/docs/openssl-certificate-authority/_downloads/intermediate-config.txt

```sh
nano openssl.conf;
```

Create a private key for the intermediate CA.

```sh
openssl genrsa -aes256 -out private/intermediate.key.pem 4096;
chmod 400 private/intermediate.key.pem;
```

Create a temporary CSR file that will help the root CA create a public certificate for the intermediate CA.

```sh
openssl req -config openssl.conf -new -sha256 \
      -key private/intermediate.key.pem \
      -out csr/intermediate.csr.pem;
```

```sh
cd ../root-ca;
```

Create the intermediate CA's public certificate, based on its CSR.

```sh
openssl ca -config openssl.conf -extensions v3_intermediate_ca \
      -days 3650 -notext -md sha512 \
      -in ../intermediate-ca/csr/intermediate.csr.pem \
      -out ../intermediate-ca/cert/intermediate.cert.pem;
chmod 444 ../intermediate-ca/cert/intermediate.cert.pem;
```

```sh
cd ../intermediate-ca;
```

Check the intermediate CA's public certificate details.

```sh
openssl x509 -noout -text \
      -in cert/intermediate.cert.pem;
```

Verify the integrity of the intermediate CA's public certificate.

```sh
openssl verify -CAfile ../root-ca/cert/ca.cert.pem \
      cert/intermediate.cert.pem;
```

Create the intermediate CA's public certificate chain file.

```sh
cat cert/intermediate.cert.pem \
      ../root-ca/cert/ca.cert.pem > cert/ca-chain.cert.pem;
chmod 444 cert/ca-chain.cert.pem;
```

Set up the directory structure for the server.

```sh
mkdir ../server;
cd ../server;
mkdir private csr cert;
chmod 700 private;
```

Create the server's private key. You can avoid adding a password by omitting the "-aes256" flag.

```sh
openssl genrsa -aes256 \
      -out private/localhost.key.pem 4096;
chmod 400 private/localhost.key.pem;
```

Create a temporary CSR file that will help the intermediate CA create a public certificate for the server.

```sh
openssl req -config ../intermediate-ca/openssl.conf \
      -key private/localhost.key.pem \
      -new -sha512 -out csr/localhost.csr.pem;
```

```sh
cd ../intermediate-ca;
```

Create the server's public certificate, based on its CSR.

```sh
openssl ca -config openssl.conf \
      -extensions server_cert -days 375 -notext -md sha512 \
      -in ../server/csr/localhost.csr.pem \
      -out ../server/cert/localhost.cert.pem;
chmod 444 ../server/cert/localhost.cert.pem;
```

```sh
cd ../server;
```

Check the server's public certificate details.

```sh
openssl x509 -noout -text \
      -in cert/localhost.cert.pem;
```

Verify the integrity of the server's public certificate.

```sh
openssl verify -CAfile ../intermediate-ca/cert/ca-chain.cert.pem \
      cert/localhost.cert.pem;
```
