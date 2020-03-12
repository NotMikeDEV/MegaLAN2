MegaLAN:
	g++ -O3 -o MegaLAN *.cpp -ldl -lcrypto -lssl -std=c++11
install: MegaLAN
	cp MegaLAN /bin/MegaLAN
debug: clean
	g++ -g -o MegaLAN *.cpp -ldl -lcrypto -lssl -std=c++11 -D_DEBUG
clean:
	rm -f MegaLAN
