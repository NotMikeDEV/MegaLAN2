# Protocol Specification

*Protocol Version 2.0*

All communication is over UDP.

Servers listen on port 54321 by default, clients use dynamic ports. It is recommended that clients generate a random port on first run and re-use this port number on future launches.

For peers with external IPv4 addresses, the addresses are sent in IPv6 format as "IPv4 mapped addresses".

Encryption uses AES256 in CBC mode with a 16 byte random IV.

The format used to specify packet layouts is [Field Name:Length] with a length of N indicating variable length fields.

*Note the files named "ServerProtocol.h" and "P2PProtocol.h" in the client source code for examples.*

# Client / Server communication

**UserID** is the SHA1 of the username.

**AuthKey** is the SHA256 of the username concatinated with the password.

Strings are sent as NULL-terminated UTF-8. (noted as N bytes). When calculating hashes over strings they are converted to UTF-8 and the NULL terminator is not included.

All requests are in the format [UserID:20][InitialisationVector:16]**[Payload:N]** Where the payload is encrypted with the users AuthKey, and begins with a 4 byte Type field as specified below.

All responses are in the format [InitialisationVector:16]**[Payload:N]** Where the payload is encrypted with the users AuthKey and begins with a 4 byte Type field as specified below.

## Create Account URL

*Uses a UserID of NULL (0000...0000) and an AuthKey of NULL (0000...0000) for request and response*

Client > Server

["URLA":4]["REGISTER":8]

Server > Client

["OPEN:4"][URL:N]

Client should then open the received URL in the default browser.

## Forgot Password URL

*Uses a UserID of NULL (0000...0000) and an AuthKey of NULL (0000...0000) for request and response*

Client > Server

["URLA":4]["FORGOTPW":8]

Server > Client

["OPEN:4"][URL:N]

Client should then open the received URL in the default browser.

## Authentication

If the server is specified as a hostname a DNS lookup should be done for AAAA and A records and the AUTH request should be sent to all of them so that both IPv4 and IPv6 external addresses can be discovered. The first server to respond should be chosen as the "preferred server" and used for further server communications.

Client > Server

["AUTH":4]

Server > Client

["AUTH":4]["OK":2][Client IP:16][Client Port:2]

Password validation is based on the fact that packets are encrypted with the users AuthKey, which is generated from their password. If a packet fails to decrypt then an EROR packet will be returned, encrypted with a NULL key.

["EROR":4][Message:N]

## VLAN Listing

Initial request [Mark] is 0x00000000, client will repeat requests with the [Mark] from the last response until a [Count] of 0 is received.

Client > Server

["LIST":4][Mark:4]

Server > Client

["LIST":4][Count:1]{[VLANID:20]:N}[Mark:4]

For each VLANID received in a LIST, the following is sent:

Client > Server

["INFO":4][VLANID:20]

Server > Client

["INFO":4][VLANID:20][Name:N][Description:N][PasswordProtected:1]

## Join VLAN

Client > Server

["JOIN":4][VLAN Name:N]

Server > Client

["JOIN":4][VLANID:20][PasswordProtected:1][Name:N]

or

["EROR":4][Error Message:N]

### Register with VLAN

Sent on intial connect, and periodically to refresh new peers.

Client > Server (***Highlighted*** part of RGST request is encrypted with the VLAN Key (SHA256 of VLAN password))

["RGST":4][VLANID:20]***["LETMEIN":7][MAC:6][IP Count:1]{[IP:16][Port:2]}:N***

Server > Client

["RGST":4][VLANID:20][IPv4:4][IPv4 Prefix:1]

or

["EROR":4][Error Message:N]

Followed by the server sending Peer Notifications for and to each peer.

### Peer Notification

Server > Client

["VLAN":4][VLANID:20][UserID:20][MAC:6][IP:16][Port:2]

### Peer Identification

Used to get peer name (used in response to initial Peer Notification).

Client > Server

["PEER":4][Peer UserID:20]

Server > Client

["PEER":4][Peer UserID:20][Username:N]

# VLAN p2p Communication

Initial p2p communication is encrypted with AES256 using a SHA256 of the VLAN password as the encryption key. If no password is specified then a NULL key is used. (0000...0000)

Once diffie-hellman keys have been exchanged between peers, PING and ETHN packets are encrypted with the shared key that was generated from the diffi-hellman exchange.

Each packet is encrypted with a 16 byte IV, followed by the payload (which starts with the 4 byte packet type).

Initial communication involves exchanging a list of other known peers to suppliment the list received from the server.

## Connection

Initial connection request:

["INIT":4][VLANID:20][UserID:20][MAC:6]

INIT reply:

["PONG":4][VLANID:20][UserID:20][MAC:6][PublicKeyLength:2][PublicKey:N][Peer Count:2]{[PeerUserID:20][PeerMAC:6][PeerIP:16][PeerPort:2]}:PeerCount

Each peer sends an "INIT" packet to the other, and gets a "PONG" response. The Public Key in the "PONG" packet is the ECDH public key of the sending node. The NIST B-571 curve is used to calculate shared keys. Once both sides have received "PONG" messages and associated public keys they can compute a shared secret. The shared key is the SHA256 of the generated shared secret.

Note: If receiving an INIT packet from an unknown address, the receiving node should add the source IP and port to its list of prospective peers and send an INIT packet back.

## KeepAlive/HeartBeat

["PING":4][VLANID:20][UserID:20][MAC:6]

PING Reply:

["PONG":4][VLANID:20][UserID:20][MAC:6][0x0000:2][0x0000:2]

This should be sent at least every 30 seconds, and a session should time-out if there is no response after multiple attempts.

Note: If a remote peer has restarted and generated new diffie-hellman keys it will not be able to decrypt the packet and will therefore not respond, allowing the session to time-out and be restarted with new INIT packets.

## Ethernet Packet

["ETHN":4][EthernetFrame:N]

Apon receiving an ETHN packet, the client should look at the source MAC address inside the payload (offset +6) and add it to an internal "switching table" so that outbound packets to that MAC address can be sent directly instead of being broadcast. *A client must not route Ethernet packets based soely on the advertised MAC addresses of peers.*

Packets with an unknown destination MAC address (offset +0) should be broadcast to every peer for which an "INIT/PONG" negotiation has been completed. If multiple addresses are avaliable for a peer, only one should be used.

Large packets (over 1000 bytes) should be split in to 2 ETHF Packets to avoid fragmentation at the network layer. PacketID is a unique identifer for the packet and should be the same in both fragments, Fragment numbers 0 and 1 are used to identify the order in which to reassemble the fragments.

["ETHF":4][PacketID:3][FragmentNumber:1][EthernetPayload:N]

Packets with a length > 1500 bytes are not supported, but may work on some clients.