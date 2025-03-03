/**
 * Favicon Generator Utility
 * Tạo favicon đơn giản cho ứng dụng VanLangBudget
 */

const fs = require('fs');
const path = require('path');

// Mã Base64 của một favicon đơn giản (hình vuông màu xanh với chữ VB)
// Đây là một favicon ICO đơn giản được mã hóa Base64
const faviconBase64 = `
AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAABILAAASCwAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAVlZWAFZWVgBWVlYAVlZWAFZWVgBWVlYAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAABPT08AVlZWAFZWVgBWVlYAVlZWAFZWVgBWVlYAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVlZWAFZWVgBWVlYAVlZWAFZWVgBWVlYAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAVlZWAFZWVgBWVlYAVlZWAFZWVgBWVlYAVlZWAFZWVgBWVlYA
VlZWAFZWVgBWVlYAAAAAAAAAAAAAAAAAAAAAAAAAAABWVlYAVlZWAFZWVgBWVlYAVlZWAFZWVgBW
VlYAVlZWAFZWVgBWVlYAVlZWAFZWVgBWVlYAVlZWAFZWVgAAAAAAAAAAAFZWVgBWVlYAVlZWAFZW
VgBWVlYAVlZWAFZWVgBWVlYAVlZWAFZWVgBWVlYAVlZWAFZWVgBWVlYAAAAAAAAAAABWVlYAVlZWA
FZWVgBWVlYAVlZWAFZWVgBWVlYAVlZWAFZWVgBWVlYAVlZWAFZWVgBWVlYAVlZWAAAAAAAAAAAAVlZ
WAFZWVgBWVlYAVlZWAFZWVgBWVlYAVlZWAFZWVgBWVlYAVlZWAFZWVgBWVlYAVlZWAFZWVgAAAAAAAA
AAAFZWVgBWVlYAVlZWAFZWVgBWVlYAVlZWAFZWVgBWVlYAVlZWAFZWVgBWVlYAVlZWAFZWVgBWVlY
AAAAAAAAAAABWVlYAVlZWAFZWVgBWVlYAVlZWAFZWVgBWVlYAVlZWAFZWVgBWVlYAVlZWAFZWVgBW
VlYAVlZWAFZWVgBWVlYAAAAAAAAAAABWVlYAVlZWAFZWVgBWVlYAVlZWAFZWVgBWVlYAVlZWAFZW
VgBWVlYAVlZWAFZWVgBWVlYAVlZWAAAAAAAAAAAAVlZWAFZWVgBWVlYAVlZWAFZWVgBWVlYAVlZW
AFZWVgBWVlYAVlZWAFZWVgBWVlYAVlZWAFZWVgAAAAAAAAAAAFZWVgBWVlYAVlZWAFZWVgBWVlYA
VlZWAFZWVgBWVlYAVlZWAFZWVgBWVlYAVlZWAFZWVgBWVlYAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//
AAD//wAA//8AAA==
`;

/**
 * Tạo file favicon.ico từ mã Base64
 */
function generateFavicon() {
    try {
        const publicDir = path.join(__dirname, '..', 'public');

        // Đảm bảo thư mục public tồn tại
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
            console.log('Created public directory');
        }

        const faviconPath = path.join(publicDir, 'favicon.ico');

        // Chuyển đổi Base64 thành Buffer và ghi vào file
        const faviconBuffer = Buffer.from(faviconBase64.trim(), 'base64');
        fs.writeFileSync(faviconPath, faviconBuffer);

        console.log(`Favicon created successfully at ${faviconPath}`);
        return true;
    } catch (error) {
        console.error('Error generating favicon:', error);
        return false;
    }
}

// Tự động tạo favicon khi module được import
generateFavicon();

module.exports = { generateFavicon }; 