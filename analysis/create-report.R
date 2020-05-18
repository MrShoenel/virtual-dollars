#!/usr/bin/env Rscript
args = commandArgs(trailingOnly=TRUE)

if (length(args) == 0) {
  stop("Exactly one argument is required: The path to a CSV file with reports, relative from here or an absolute path.")
}

dataFile <- gsub("\\\\", "/", base::normalizePath(args[1], mustWork = TRUE))
noExt <- tools::file_path_sans_ext(base::basename(args[1]))

print(paste0("Using file: ", dataFile))


rmd <- paste(
  base::readLines(
    normalizePath("./report-template.Rmd", mustWork = TRUE)),
  collapse = "\n")
rmd <- gsub("__DATAFILE__", dataFile, rmd)

rmdReport <- normalizePath(paste0("./report_", noExt, ".Rmd"), mustWork = FALSE)
base::writeLines(rmd, file(rmdReport))


requiredPackages <- c("rmarkdown", "ggplot2", "dplyr")
for (rp in requiredPackages) {
  if (!(rp %in% rownames(installed.packages()))) {
    install.packages(rp)
  }
  if (!(rp %in% .packages())) {
    library(rp, character.only = T)
  }
}


rmarkdown::render(rmdReport, output_dir = normalizePath("./output"), output_format = "all", output_file = rep(noExt, 4))

base::unlink(rmdReport)
