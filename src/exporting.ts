/**
 * Getting the report and the CSV out: the PDF through expo-print (the
 * engine's PDF path), the CSV as a file. Both are made on the phone and go
 * only where the person sends them. Pro only; the screens check first.
 */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { nameForShare, writeShareFile } from './files';
import { attacksCsv, exportName, reportHtml, ReportModel } from './report';
import type { Attack } from './model';

/** Prints the report to a PDF and opens the share sheet for it (Mail, Messages, Files, AirDrop). */
export async function shareReport(model: ReportModel): Promise<void> {
  const printed = await Print.printToFileAsync({ html: reportHtml(model) });
  const name = exportName('report', Date.now());
  const uri = nameForShare(printed.uri, `${name}.pdf`);
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: name });
}

/** The system print sheet, straight to a printer or a PDF. */
export async function printReport(model: ReportModel): Promise<void> {
  await Print.printAsync({ html: reportHtml(model) });
}

/** Every attack as a CSV file, through the share sheet. */
export async function shareCsv(attacks: Attack[]): Promise<void> {
  const name = exportName('attacks', Date.now());
  const uri = writeShareFile(`${name}.csv`, attacksCsv(attacks, Date.now()));
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: name });
}
