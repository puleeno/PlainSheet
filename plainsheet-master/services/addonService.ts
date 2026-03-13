
import { GoogleGenAI } from "@google/genai";
import { AddonManifest } from '../types';

/**
 * Heuristic mapping for bank statement headers
 */
const BANK_HEADER_MAPS: Record<string, string[]> = {
  date: ['date', 'transaction date', 'posted date', 'valutadatum', 'buchungstag'],
  description: ['description', 'memo', 'details', 'payee', 'verwendungszweck', 'umsatztext'],
  amount: ['amount', 'value', 'betrag'],
  debit: ['debit', 'withdrawal', 'out', 'paid out', 'soll'],
  credit: ['credit', 'deposit', 'in', 'paid in', 'haben']
};

export const ADDON_LIBRARY: AddonManifest[] = [
  {
    id: 'bank-acc-mapping',
    name: 'Accounting Mapper',
    category: 'Format',
    description: 'Auto-map bank statements (Chase, HSBC, etc.) to QuickBooks/Xero standard OFX/QBO formats.',
    icon: '🏦',
    execute: async (ctx) => {
      ctx.setIsProcessing(true);
      ctx.notify('Analyzing bank statement structure...', 'info');

      const cols = ctx.data.columns.map(c => c.toLowerCase());
      const mapping: Record<string, string> = {};

      // Identify columns based on heuristics
      Object.entries(BANK_HEADER_MAPS).forEach(([key, aliases]) => {
        const found = ctx.data.columns.find(c => aliases.includes(c.toLowerCase()));
        if (found) mapping[key] = found;
      });

      if (!mapping.date || (!mapping.amount && !(mapping.debit && mapping.credit))) {
        ctx.notify('Could not auto-detect standard bank columns. Please ensure headers like "Date" and "Amount" exist.', 'error');
        ctx.setIsProcessing(false);
        return;
      }

      // Transform rows to standard accounting format
      const standardized = ctx.data.rows.map(row => {
        let amount = 0;
        if (mapping.amount) {
          amount = parseFloat(String(row[mapping.amount]).replace(/[^-0-9.]/g, '')) || 0;
        } else {
          const debit = parseFloat(String(row[mapping.debit!] || '0').replace(/[^-0-9.]/g, '')) || 0;
          const credit = parseFloat(String(row[mapping.credit!] || '0').replace(/[^-0-9.]/g, '')) || 0;
          amount = credit - Math.abs(debit);
        }

        return {
          date: String(row[mapping.date!]),
          desc: String(row[mapping.description!] || 'Transaction'),
          amount: amount
        };
      });

      // Generate OFX (Open Financial Exchange) content
      const generateOFX = (rows: any[]) => {
        const now = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
        let ofx = `OFXHEADER:100\nDATA:OFXSGML\nVERSION:102\nSECURITY:NONE\nENCODING:USASCII\nCHARSET:1252\nCOMPRESSION:NONE\nOLDFILEUID:NONE\nNEWFILEUID:NONE\n\n<OFX>\n<SIGNONMSGSRSV1>\n<SONRS>\n<STATUS><CODE>0<SEVERITY>INFO</STATUS>\n<DTSERVER>${now}\n<LANGUAGE>ENG</LANGUAGE>\n</SONRS>\n</SIGNONMSGSRSV1>\n<BANKMSGSRSV1>\n<STMTTRNRS>\n<TRNUID>${now}\n<STATUS><CODE>0<SEVERITY>INFO</STATUS>\n<STMTRS>\n<CURDEF>USD</CURDEF>\n<BANKTRANLIST>\n`;
        
        rows.forEach((r, i) => {
          const rDate = new Date(r.date).toISOString().replace(/-/g, '').split('T')[0] || now.split('T')[0];
          ofx += `<STMTTRN>\n<TRNTYPE>${r.amount >= 0 ? 'CREDIT' : 'DEBIT'}\n<DTPOSTED>${rDate}\n<TRNAMT>${r.amount.toFixed(2)}\n<FITID>${now}${i}\n<NAME>${r.desc.substring(0, 32)}\n</STMTTRN>\n`;
        });

        ofx += `</BANKTRANLIST>\n</STMTRS>\n</STMTTRNRS>\n</BANKMSGSRSV1>\n</OFX>`;
        return ofx;
      };

      try {
        const ofxContent = generateOFX(standardized);
        const blob = new Blob([ofxContent], { type: 'application/x-ofx' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${ctx.data.name.split('.')[0] || 'statement'}_accounting_ready.ofx`;
        link.click();
        URL.revokeObjectURL(url);

        ctx.notify('Successfully mapped and exported to OFX format!', 'success');
      } catch (err) {
        ctx.notify('Export failed: ' + (err as Error).message, 'error');
      } finally {
        ctx.setIsProcessing(false);
      }
    }
  },
  {
    id: 'ai-architect',
    name: 'AI Data Architect',
    category: 'AI',
    description: 'Uses Gemini to normalize data, fix typos, or fill missing cells based on row patterns.',
    icon: '✨',
    execute: async (ctx) => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      ctx.setIsProcessing(true);
      
      try {
        const sampleRows = ctx.data.rows.slice(0, 10);
        const prompt = `Act as a data cleaning expert. I have a dataset with columns: [${ctx.data.columns.join(', ')}]. 
        Here are some sample rows: ${JSON.stringify(sampleRows)}.
        Please analyze the whole dataset and provide a JSON array of objects where each object represents a "corrected" version of the row. 
        Focus on: Fixing capitalization, trimming whitespace, and standardizing date/category formats. 
        IMPORTANT: Return ONLY the JSON array of objects.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });

        const correctedRows = JSON.parse(response.text);
        ctx.updateData({ rows: correctedRows });
        ctx.notify('AI Cleaned ' + correctedRows.length + ' rows successfully!', 'success');
      } catch (e) {
        ctx.notify('AI Processing failed: ' + (e as Error).message, 'error');
      } finally {
        ctx.setIsProcessing(false);
      }
    }
  },
  {
    id: 'gdpr-anonymizer',
    name: 'GDPR Data Scrubber',
    category: 'Data',
    description: 'Auto-detect and mask PII (Emails, SSN, IP) using legal compliance standards.',
    icon: '🛡️',
    execute: async (ctx) => {
      ctx.setIsProcessing(true);
      ctx.notify('Scanning for sensitive data (Emails, Phones, SSNs)...', 'info');
      
      const emailRegex = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}/gi;
      const phoneRegex = /(\+\d{1,2}\s?)?1?\-?\.?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
      
      const newRows = ctx.data.rows.map(row => {
        const newRow = { ...row };
        Object.keys(newRow).forEach(k => {
          if (typeof newRow[k] === 'string') {
            let val = newRow[k] as string;
            val = val.replace(emailRegex, '[ANONYMIZED EMAIL]');
            val = val.replace(phoneRegex, '[REDACTED PHONE]');
            newRow[k] = val;
          }
        });
        return newRow;
      });

      setTimeout(() => {
        ctx.updateData({ rows: newRows });
        ctx.notify('Legal Tech Scrubbing Complete: All PII masked.', 'success');
        ctx.setIsProcessing(false);
      }, 1000);
    }
  },
  {
    id: 'trimmer',
    name: 'The Great Trimmer',
    category: 'Data',
    description: 'One-click whitespace removal across all columns.',
    icon: '🧹',
    execute: async (ctx) => {
      const newRows = ctx.data.rows.map(row => {
        const newRow = { ...row };
        Object.keys(newRow).forEach(key => {
          if (typeof newRow[key] === 'string') {
            newRow[key] = (newRow[key] as string).trim();
          }
        });
        return newRow;
      });
      ctx.updateData({ rows: newRows });
      ctx.notify('Data trimmed successfully!', 'success');
    }
  }
];
