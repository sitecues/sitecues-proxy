The Sitecues Proxy supports HTTPS traffic using state-of-the-art encryption. In most situations it will Just Work™ and you won't have to touch anything in here.

There is one exception to this: if you need to use the proxy with HTTPS and visit it with a hostname other than localhost (e.g. an IP address) and you cannot use the browser's "continue anyway" or equivalent button when the security warning shows up.

Under that scenario, the problem is that the security certificate included with the proxy only knows about localhost, because that is the one constant in the universe shared between all developers. What you need is a security certificate that has your IP address (or whatever hostname the proxy is running on) in the Common Name and/or Subject Alternative Name fields. Then you need to wire up the proxy to use that certificate instead of the default localhost one.

To do this, you create a private key for a new security certificate representing the proxy running on your non-localhost hostname, then you create a Certificate Signing Request (CSR) based on that private key, and finally you use the Certificate Authority for all proxy activity to sign the CSR in order to generate the public key for your fancy proxy installation.

Sounds complicated? It is really just a handful of commands in the terminal with OpenSSL, software that you likely already have on your computer.

Resources:
 - https://jamielinux.com/docs/openssl-certificate-authority/
 - https://bitbucket.org/ai_squared/sitecues-certificate-authority/src/master/pki.md
