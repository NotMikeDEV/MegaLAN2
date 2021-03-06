**Project Status: Under development.** Not live yet.
# [MegaLAN2](https://megalan.app/)
MegaLAN is a peer to peer VPN client for creating adhoc Virtual LANs.

Users can create private or public LANs. Users can then join these networks within seconds. Virtual LANs appear as a virtual network interface, which simulates an extra ethernet connection between devices.

Do you need to use an application that only works between hosts on the same LAN? File Sharing, Gaming, Media Streaming, etc.

Many older games require that users be on a shared LAN for local multiplayer functionality, sometimes using protocols such as IPX. These applications will operate over MegaLAN without users needing to set up their own servers or coordinate creating connections to each other using potentially dynamic IP addresses.

MegaLAN should be suitable for most scenarios where a direct LAN connection is needed between multiple users over the Internet.

User and VLAN management is handled by a redundant cloud platform, but VLANs are hosted directly by clients using peer to peer communications to send traffic directly between nodes. VLAN traffic does not pass through the server.

The server provides basic automatic IPv4 assignment functionality for ease of use, however because the networks are implemented at layer 2 any ethernet based protocol can be run over VLANs.

### Project Info
This project is a complete rewrite of the original MegaLAN project. An archive of the code for the original project can be found on [GitHub](https://github.com/NotMikeDEV/MegaLAN). The official servers and public website are located at https://MegaLAN.app/

This software is being is developed as part of a student project at the University of Plymouth. Inquiries should be directed towards the project developer, Michael Jones. The allocated project supervisor is Bogdan Ghita.
