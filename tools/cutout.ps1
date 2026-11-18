Add-Type -AssemblyName System.Drawing

$code = @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public class LogoCut
{
    public static string Process(string src, string dst, int cropH)
    {
        using (var bmp = new Bitmap(src))
        {
            int W = bmp.Width;
            int H = Math.Min(cropH, bmp.Height);

            using (var crop = new Bitmap(W, H, PixelFormat.Format32bppArgb))
            {
                using (var g = Graphics.FromImage(crop))
                {
                    g.DrawImage(bmp, new Rectangle(0, 0, W, H), new Rectangle(0, 0, W, H), GraphicsUnit.Pixel);
                }

                var rect = new Rectangle(0, 0, W, H);
                var data = crop.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
                int stride = data.Stride;
                byte[] buf = new byte[stride * H];
                Marshal.Copy(data.Scan0, buf, 0, buf.Length);

                int removed = 0;
                for (int y = 0; y < H; y++)
                {
                    int row = y * stride;
                    for (int x = 0; x < W; x++)
                    {
                        int i = row + x * 4;
                        byte b = buf[i], gg = buf[i + 1], r = buf[i + 2];
                        int mx = Math.Max(r, Math.Max(gg, b));
                        int mn = Math.Min(r, Math.Min(gg, b));
                        int sat = mx - mn;
                        int lum = (r + gg + b) / 3;

                        // warm, low-saturation and light => paper background
                        if (sat < 58 && r >= gg && gg >= b && lum > 58)
                        {
                            buf[i + 3] = 0;
                            removed++;
                        }
                    }
                }

                // feather the alpha edge (3x3 box blur on alpha only)
                byte[] alpha = new byte[W * H];
                for (int y = 0; y < H; y++)
                    for (int x = 0; x < W; x++)
                        alpha[y * W + x] = buf[y * stride + x * 4 + 3];

                byte[] soft = new byte[W * H];
                for (int y = 0; y < H; y++)
                {
                    for (int x = 0; x < W; x++)
                    {
                        int sum = 0, count = 0;
                        for (int dy = -1; dy <= 1; dy++)
                        {
                            int ny = y + dy;
                            if (ny < 0 || ny >= H) continue;
                            for (int dx = -1; dx <= 1; dx++)
                            {
                                int nx = x + dx;
                                if (nx < 0 || nx >= W) continue;
                                int w = (dx == 0 && dy == 0) ? 4 : 1;
                                sum += alpha[ny * W + nx] * w;
                                count += w;
                            }
                        }
                        byte v = (byte)(sum / count);
                        // keep solid interiors fully opaque
                        soft[y * W + x] = alpha[y * W + x] == 255 && v > 235 ? (byte)255 : v;
                    }
                }

                for (int y = 0; y < H; y++)
                    for (int x = 0; x < W; x++)
                        buf[y * stride + x * 4 + 3] = soft[y * W + x];

                Marshal.Copy(buf, 0, data.Scan0, buf.Length);
                crop.UnlockBits(data);

                // trim transparent margins
                int minX = W, minY = H, maxX = -1, maxY = -1;
                for (int y = 0; y < H; y++)
                {
                    for (int x = 0; x < W; x++)
                    {
                        if (soft[y * W + x] > 10)
                        {
                            if (x < minX) minX = x;
                            if (x > maxX) maxX = x;
                            if (y < minY) minY = y;
                            if (y > maxY) maxY = y;
                        }
                    }
                }
                if (maxX < 0) { minX = 0; minY = 0; maxX = W - 1; maxY = H - 1; }

                int pad = 10;
                minX = Math.Max(0, minX - pad); minY = Math.Max(0, minY - pad);
                maxX = Math.Min(W - 1, maxX + pad); maxY = Math.Min(H - 1, maxY + pad);

                var outRect = new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1);
                using (var output = crop.Clone(outRect, PixelFormat.Format32bppArgb))
                {
                    output.Save(dst, ImageFormat.Png);
                    double pct = (double)removed / (W * H) * 100.0;
                    return string.Format("saved {0}x{1} ({2:F1}% keyed)", output.Width, output.Height, pct);
                }
            }
        }
    }
}
'@

Add-Type -TypeDefinition $code -ReferencedAssemblies System.Drawing

$src = 'C:\Users\rampr\liha-tex\frontend\assets\liha-logo-source.png'
$dst = 'C:\Users\rampr\liha-tex\frontend\assets\liha-logo.png'

$result = [LogoCut]::Process($src, $dst, 920)
Write-Output $result
Get-Item $dst | Select-Object Name, Length | Format-Table -AutoSize
