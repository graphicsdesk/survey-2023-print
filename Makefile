.PHONY: data download

data:
	mkdir -p data
	make download

download:
	node process/download-data.js

maps/UScounties_points.shp:
	mapshaper maps/UScounties.shp -points -o $@
