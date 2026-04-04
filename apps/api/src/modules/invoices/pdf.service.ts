import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { renderInvoiceHtml, InvoiceTemplateData } from './templates/invoice.template';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async generateInvoicePdf(data: InvoiceTemplateData): Promise<Buffer> {
    const html = renderInvoiceHtml(data);

    let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();

      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0',
        },
      });

      this.logger.log(`Generated PDF for invoice ${data.id}`);
      return Buffer.from(pdfBuffer);
    } catch (err) {
      this.logger.error(`Failed to generate PDF for invoice ${data.id}`, err);
      throw new InternalServerErrorException('Failed to generate invoice PDF');
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
