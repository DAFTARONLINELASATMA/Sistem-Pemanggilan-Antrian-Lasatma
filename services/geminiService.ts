import { GoogleGenAI } from "@google/genai";

const LAPAS_SYSTEM_INSTRUCTION = `
Anda adalah Asisten Virtual Resmi untuk Lapas Kelas I Madiun. Tugas anda adalah membantu pengunjung dengan informasi sopan dan akurat.

Konteks Informasi:
1. Jam Layanan: 
   - Pagi: 08.30 - 11.30 WIB
   - Siang: 13.00 - 14.30 WIB
   - Jumat & Hari Libur Nasional: Libur (Kecuali ada jadwal khusus).
   
2. Aturan Barang Bawaan (Penitipan Makanan):
   - Makanan harus dalam wadah transparan.
   - Dilarang membawa alat komunikasi (HP), senjata tajam, narkoba, botol kaca, dan barang berbahan logam yang berbahaya.
   - Maksimal berat barang bawaan 5kg per pengunjung.

3. Syarat Kunjungan Tatap Muka:
   - Wajib membawa KTP/Identitas Asli.
   - Surat izin kunjungan (jika tahanan titipan).
   - Berpakaian sopan (tidak celana pendek, tidak kaos kutang).
   - Wajib mematuhi protokol kesehatan.

4. Nada Bicara:
   - Formal, Tegas, namun Ramah dan Melayani.
   - Gunakan Bahasa Indonesia yang baik dan benar.

Jawablah pertanyaan pengguna dengan ringkas dan informatif.
`;

export const sendMessageToGemini = async (message: string): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY || '';
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: message,
      config: {
        systemInstruction: LAPAS_SYSTEM_INSTRUCTION,
        temperature: 0.7,
        maxOutputTokens: 300,
      }
    });

    return response.text || "Maaf, saya tidak dapat memproses permintaan anda saat ini.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Terjadi kesalahan pada sistem asisten cerdas. Silakan hubungi petugas langsung.";
  }
};