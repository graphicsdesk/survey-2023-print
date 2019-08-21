.PHONY: data download

data:
	mkdir -p data
	make download

download:
	node process/download-data.js

maps/tl_2016_us_county_points.shp:
	mapshaper maps/tl_2016_us_county.shp -points -o $@
