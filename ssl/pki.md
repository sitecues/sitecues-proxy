# Create a PKI chain.

> Root CA => Intermediate CA => Server

Set up the directory structure for the root CA.

```sh
mkdir root-ca;
cd root-ca;
mkdir private certs crl newcerts;
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
      -key private/ca.key.pem \
      -new -x509 -days 7300 -sha256 -extensions v3_ca \
      -out certs/ca.cert.pem;
chmod 444 certs/ca.cert.pem;
```

Check the root CA's public certificate details.

```sh
openssl x509 -noout -text -in certs/ca.cert.pem;
```

Set up the directory structure for the intermediate CA.

```sh
mkdir ../intermediate-ca;
cd ../intermediate-ca;
mkdir private csr certs crl newcerts;
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
      -days 3650 -notext -md sha256 \
      -in ../intermediate-ca/csr/intermediate.csr.pem \
      -out ../intermediate-ca/certs/intermediate.cert.pem;
chmod 444 ../intermediate-ca/certs/intermediate.cert.pem;
```

```sh
cd ../intermediate-ca;
```

Check the intermediate CA's public certificate details.

```sh
openssl x509 -noout -text \
      -in certs/intermediate.cert.pem;
```

Verify the integrity of the intermediate CA's public certificate.

```sh
openssl verify -CAfile ../root-ca/certs/ca.cert.pem \
      certs/intermediate.cert.pem;
```

Create the intermediate CA's public certificate chain file.

```sh
cat certs/intermediate.cert.pem \
      ../root-ca/certs/ca.cert.pem > certs/ca-chain.cert.pem;
chmod 444 certs/ca-chain.cert.pem;
```

Set up the directory structure for the server.

```sh
mkdir ../server;
cd ../server;
mkdir private csr certs;
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
      -new -sha256 -out csr/localhost.csr.pem;
```

```sh
cd ../intermediate-ca;
```

Create the server's public certificate, based on its CSR.

```sh
openssl ca -config openssl.conf \
      -extensions server_cert -days 375 -notext -md sha256 \
      -in ../server/csr/localhost.csr.pem \
      -out ../server/certs/localhost.cert.pem;
chmod 444 ../server/certs/localhost.cert.pem;
```

```sh
cd ../server;
```

Check the server's public certificate details.

```sh
openssl x509 -noout -text \
      -in certs/localhost.cert.pem;
```

Verify the integrity of the server's public certificate.

```sh
openssl verify -CAfile ../intermediate-ca/certs/ca-chain.cert.pem \
      certs/localhost.cert.pem;
```
