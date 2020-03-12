#include "Globals.h"
#include <signal.h>

Connection* Cloud = NULL;
void term(int signum)
{
	if (Cloud)
		Cloud->Terminate();
	printf("Exiting.\n");
}

int print_usage(const char* progname, String Error = NULL)
{
	if (Error.length())
		printf("%s\n", (LPCSTR)Error);
	printf("Usage: %s <username> <password> [options]\n", progname);
	printf("Options:\n");
	printf("\t-c <network>\tConnect to specified network.\n");
	printf("\t-p <password>\tSpecify a network password.\n");
	printf("\t-s <server>\tSpecify server. (default: megalan.app)\n");
	printf("\t-i <iface>\tSpecifiy the name of the virtual interface.\n");
#ifdef _DEBUG
	printf("\t-D        \tEnable debug output. (Use multiple times for verbose)\n");
#endif
	printf("Network Types:\n");
	printf("[ ] Public\n");
	printf("[*] Password Protected\n");
	printf("[+] Private\n");
	return 1;
}

int ListNum = 0;
void ListingCallback(const unsigned char ID[20], BYTE Type, String Name)
{
	DEBUG(2, "Listing: %u %s", Type, (LPSTR)Name);
	char* TypeIndicator = "[ ]";
	if (Type == 1)
		TypeIndicator = "[*]";
	if (Type == 2)
		TypeIndicator = "[+]";
	printf("%u %s %s\n", ++ListNum, TypeIndicator, (LPCSTR)Name);
}

int main(int argc, char* argv[])
{
	struct sigaction action;
	memset(&action, 0, sizeof(struct sigaction));
	action.sa_handler = term;
	sigaction(SIGTERM, &action, NULL);
	sigaction(SIGINT, &action, NULL);
	setlocale(LC_ALL, "UTF-8");

	String Username = argv[1];
	String Password = argv[2];
	memset(argv[2], '*', strlen(argv[2]));
	String Server = NULL;
	String InterfaceName = NULL;
	String NetworkPassword = NULL;
	String NetworkName = NULL;
	if (argc > 3)
	{
		char** argp = &argv[3];
		while (*argp)
		{
			if (strcmp(argp[0], "-c") == 0 && argp[1] && strlen(argp[1]) && !NetworkName.length())
			{
				NetworkName = argp[1];
				argp++;
				argp++;
			}
			else if (strcmp(argp[0], "-p") == 0 && argp[1] && strlen(argp[1]) && !NetworkPassword.length())
			{
				NetworkPassword = argp[1];
				memset(argv[1], '*', strlen(argv[1]));
				argp++;
				argp++;
			}
			else if (strcmp(argp[0], "-i") == 0 && argp[1] && strlen(argp[1]) && !InterfaceName.length())
			{
				InterfaceName = argp[1];
				argp++;
				argp++;
			}
			else if (strcmp(argp[0], "-s") == 0 && argp[1] && strlen(argp[1]) && !Server.length())
			{
				Server = argp[1];
				argp++;
				argp++;
			}
#ifdef _DEBUG
			else if (strcmp(argp[0], "-D") == 0)
			{
				DebugEnabled++;
				argp++;
			}
#endif
			else
			{
				return print_usage(argv[0], String("Invalid option: ") + argp[0]);
			}
		}
	}
	if (argc < 3)
	{
		print_usage(argv[0]);
		unsigned char UserID[20] = { 0 };
		unsigned char UserKey[32] = { 0 };
		Connection Cloud(Server, UserID, UserKey);
		return 1;
	}

	unsigned char UserID[20];
	Crypto::SHA1(Username.toLower(), UserID);
	unsigned char UserKey[32];
	Crypto::SHA256(Username.toLower() + Password, UserKey);

	if (!Server.length())
		Server = "client.megalan.app";

	if (DebugEnabled)
		DEBUG(1, "Debug Level: %u", DebugEnabled);

	DEBUG(1, "Args %d", argc);
	DEBUG(1, "Server: %s", (LPCSTR)Server);
	DEBUG(1, "Username: %s", (LPCSTR)Username);
	DEBUG(1, "Password: %s", (LPCSTR)Password);
	DEBUG(1, "UserID: %s", (LPCSTR)String::toHex(UserID, 20));
	DEBUG(1, "UserKey: %s", (LPCSTR)String::toHex(UserKey, 32));

	Cloud = new Connection(Server, UserID, UserKey);

	bool OK = Cloud->AUTH();
	if (!OK)
	{
		printf("Unable to connect.\n");
		return -1;
	}

	if (NetworkName.length() == 0)
	{
		printf("Avaliable Networks:\n");
		return Cloud->LIST(ListingCallback)?0:1;
	}
	else
	{
		DEBUG(1, "NetworkName: %s", (LPCSTR)NetworkName);
		if (NetworkPassword.length())
		{
			unsigned char NetworkKey[32];
			Crypto::SHA256(NetworkPassword, NetworkKey);
			DEBUG(1, "NetworkPassword: %s", (LPCSTR)NetworkPassword);
			DEBUG(1, "NetworkKey: %s", (LPCSTR)(LPCSTR)String::toHex(NetworkKey, 32));
		}
		if (InterfaceName.length())
			DEBUG(1, "InterfaceName: %s", (LPCSTR)InterfaceName);
		printf("Joining Network\n");
	}
	delete Cloud;
	return 0;
}