library(tidyverse)
library(jsonlite)

# read and tweak zipcode <-> FIPS data
zip_fips <- read.csv("ZIP-COUNTY-FIPS.csv") %>% 
  select(ZIP, STCOUNTYFP) %>% 
  rename(zipcode = ZIP, fips = STCOUNTYFP) %>% 
  mutate(
    fips = if_else(fips > 9999, paste("", fips, sep = ""), paste("0", fips, sep = "")),
    fips = as.character(fips)
  )

# read responses, merge zipcodes
responses <- fromJSON("../data/form_responses.json") %>% 
  merge(zip_fips, by = "zipcode") %>% 
  select(zipcode, fips)

# export response count by FIPS
responses %>% 
  group_by(fips) %>% 
  count() %>% 
  write.csv(file = "fips_counts.csv") 
