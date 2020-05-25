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


requiredPackages <- c("rmarkdown", "ggplot2", "dplyr", "parallel", "foreach", "doSNOW")
for (rp in requiredPackages) {
  if (!(rp %in% rownames(suppressWarnings(suppressMessages(installed.packages()))))) {
    install.packages(rp)
  }
  if (!(rp %in% .packages())) {
    suppressWarnings(suppressMessages(library(rp, character.only = T)))
  }
}


renderFormats = c("pdf_document", "word_document", "md_document", "html_document")

cl <- parallel::makeCluster(length(renderFormats))
doSNOW::registerDoSNOW(cl)

tryCatch({
  pb <- txtProgressBar(max = length(renderFormats), style = 3)
  progress <- function(n) setTxtProgressBar(pb, n)
  
  reports <- foreach::foreach(
    rf = renderFormats,
    .combine = c,
    .options.snow = list(progress = progress)
  ) %dopar% {
    rmarkdown::render(
      rmdReport,
      output_dir = normalizePath("./output"),
      output_format = rf,
      output_file = noExt)
  }
  
  cat("\r\n\r\nCreated the following reports:\r\n\r\n")
  print(reports)
}, warning=function(cond) {
  print(paste("A warning occured:", cond))
}, error=function(cond) {
  print(paste("An error occured:", cond))
}, finally = {
  parallel::stopCluster(cl)
  foreach::registerDoSEQ()
  base::unlink(rmdReport)
})
