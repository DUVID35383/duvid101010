import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for base64 receipt images/PDFs
  app.use(express.json({ limit: '25mb' }));

  // Initialize Gemini Client
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not defined.');
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // API Health Endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // API Gemini Receipt / Invoice Scanner Route
  app.post('/api/scan-receipt', async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: 'חסר קובץ חשבונית לסריקה (Base64)' });
      }

      const ai = getGeminiClient();

      // Clean base64 string if data url prefix is included
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: cleanBase64,
              },
            },
            {
              text: `אתה מומחה לניתוח חשבוניות וקבלות לבנייה ולחומרי גלם בישראל.
נתח את תמונת החשבונית/הקבלה המצורפת וחלץ בצורה מדויקת את הפרטים הבאים בפורמט JSON:
- שם הספק (supplierName)
- תאריך (date) בפורמט YYYY-MM-DD
- סכום כולל (totalAmount) בש"ח
- רשימת פריטים (items) שכוללת:
  * שם הפריט / תיאור החומר (item)
  * קטגוריה מתאימה (category): אחת מתוך [construction, floor, panels, wheels, openings, electrical, insulation, hardware]
  * כמות (qty)
  * מחיר יחידה (unitPrice) בש"ח
  * מחיר כולל לפריט (totalPrice) בש"ח
- ציון אמינות (confidenceScore) בין 0 ל-100.

אם החשבונית בעברית, שמור על שמות הפריטים בעברית צחה.`,
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              supplierName: { type: Type.STRING, description: 'שם הספק/החנות' },
              date: { type: Type.STRING, description: 'תאריך YYYY-MM-DD' },
              totalAmount: { type: Type.NUMBER, description: 'סה"כ לתשלום' },
              confidenceScore: { type: Type.NUMBER, description: 'ציון אמינות לסריקה' },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    item: { type: Type.STRING, description: 'תיאור הפריט' },
                    category: { 
                      type: Type.STRING, 
                      description: 'אחת מתוך construction, floor, panels, wheels, openings, electrical, insulation, hardware' 
                    },
                    qty: { type: Type.NUMBER, description: 'כמות' },
                    unitPrice: { type: Type.NUMBER, description: 'מחיר יחידה' },
                    totalPrice: { type: Type.NUMBER, description: 'מחיר כולל' },
                  },
                  required: ['item', 'category', 'qty', 'unitPrice', 'totalPrice'],
                },
              },
              notes: { type: Type.STRING, description: 'הערות או פירוט מע"מ' },
            },
            required: ['supplierName', 'date', 'totalAmount', 'items'],
          },
        },
      });

      const responseText = response.text || '{}';
      const parsedData = JSON.parse(responseText);

      return res.json({
        success: true,
        data: parsedData,
      });
    } catch (error: any) {
      console.error('Error scanning receipt:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'שגיאה בפענוח החשבונית באמצעות AI',
      });
    }
  });

  // Vite Middleware for dev, or static serve for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
