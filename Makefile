.PHONY: data download

data:
	mkdir -p data
	make download

download:
	node process/download-data.js
