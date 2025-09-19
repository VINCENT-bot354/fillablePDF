export const loadPDFPage = async (file: File): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    
    fileReader.onload = async function() {
      try {
        // Import PDF.js dynamically
        const pdfjsLib = await import('pdfjs-dist');
        
        // Set worker source
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        const typedarray = new Uint8Array(this.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        const page = await pdf.getPage(1);
        
        const viewport = page.getViewport({ scale: 1 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas
        }).promise;
        
        resolve({
          canvas,
          width: viewport.width,
          height: viewport.height
        });
      } catch (error) {
        reject(error);
      }
    };
    
    fileReader.onerror = () => reject(new Error('Failed to read file'));
    fileReader.readAsArrayBuffer(file);
  });
};

export const loadImageData = async (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
};

export const convertPdfToImage = (canvas: HTMLCanvasElement): string => {
  return canvas.toDataURL('image/png');
};
