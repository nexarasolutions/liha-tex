Add-Type -AssemblyName System.Drawing

$code = @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public class LogoKey
{
    // Warm, low-saturation, light pixels are the paper backdrop.
    static bool IsPaper(int r, int g, int b)
    {
        int mx = Math.Max(r, Math.Max(g, b));
        int mn = Math.Min(r, Math.Min(g, b));
        int sat = mx - mn;
        int lum = (r + g + b) / 3;
        return sat < 58 && r >= g && g >= b && lum > 58;
    }

    // Bright neutral highlights (cotton boll, specular) must stay.
    static bool IsWhite(int r, int g, int b)
    {
        int mx = Math.Max(r, Math.Max(g, b));
        int mn = Math.Min(r, Math.Min(g, b));
        return (mx - mn) < 21 && ((r + g + b) / 3) > 205;
    }

    public static string Process(string src, string dst, int outSize)
    {
        using (var bmp = new Bitmap(src))
        {
            int W = bmp.Width, H = bmp.Height;
            using (var work = new Bitmap(W, H, PixelFormat.Format32bppArgb))
            {
                using (var g = Graphics.FromImage(work))
                    g.DrawImage(bmp, new Rectangle(0, 0, W, H));

                var rect = new Rectangle(0, 0, W, H);
                var data = work.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
                int stride = data.Stride;
                byte[] buf = new byte[stride * H];
                Marshal.Copy(data.Scan0, buf, 0, buf.Length);

                int removed = 0, kept = 0;
                for (int y = 0; y < H; y++)
                {
                    int row = y * stride;
                    for (int x = 0; x < W; x++)
                    {
                        int i = row + x * 4;
                        byte b = buf[i], gg = buf[i + 1], r = buf[i + 2];

                        if (IsPaper(r, gg, b)) { buf[i + 3] = 0; removed++; }
                        else if (IsWhite(r, gg, b)) { buf[i + 3] = 255; kept++; }
                    }
                }

                // soften only the keyed edge, leaving solid interiors untouched
                byte[] alpha = new byte[W * H];
                for (int y = 0; y < H; y++)
                    for (int x = 0; x < W; x++)
                        alpha[y * W + x] = buf[y * stride + x * 4 + 3];

                byte[] soft = new byte[W * H];
                for (int y = 0; y < H; y++)
                {
                    for (int x = 0; x < W; x++)
                    {
                        int a = alpha[y * W + x];
                        if (a == 255) { soft[y * W + x] = 255; continue; }
                        int sum = 0, count = 0;
                        for (int dy = -1; dy <= 1; dy++)
                        {
                            int ny = y + dy;
                            if (ny < 0 || ny >= H) continue;
                            for (int dx = -1; dx <= 1; dx++)
                            {
                                int nx = x + dx;
                                if (nx < 0 || nx >= W) continue;
                                int w = (dx == 0 && dy == 0) ? 3 : 1;
                                sum += alpha[ny * W + nx] * w;
                                count += w;
                            }
                        }
                        soft[y * W + x] = (byte)(sum / count);
                    }
                }

                for (int y = 0; y < H; y++)
                    for (int x = 0; x < W; x++)
                        buf[y * stride + x * 4 + 3] = soft[y * W + x];

                Marshal.Copy(buf, 0, data.Scan0, buf.Length);
                work.UnlockBits(data);

                // full artwork, no crop: scale the square down for the web
                using (var output = new Bitmap(outSize, outSize, PixelFormat.Format32bppArgb))
                {
                    using (var g2 = Graphics.FromImage(output))
                    {
                        g2.CompositingMode = System.Drawing.Drawing2D.CompositingMode.SourceCopy;
                        g2.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                        g2.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;
                        g2.Clear(Color.Transparent);
                        g2.DrawImage(work, new Rectangle(0, 0, outSize, outSize), 0, 0, W, H, GraphicsUnit.Pixel);
                    }
                    var tmp = dst + ".tmp.png";
                    output.Save(tmp, ImageFormat.Png);
                    return string.Format("{0}x{1} -> {2}px, keyed {3:F1}%, whiteness kept {4}",
                        W, H, outSize, (double)removed / (W * H) * 100.0, kept);
                }
            }
        }
    }
}
'@

Add-Type -TypeDefinition $code -ReferencedAssemblies System.Drawing

$src = 'C:\Users\rampr\Downloads\376508dd-ac11-419a-833b-af7ee2bc329b.png'
$dst = 'C:\Users\rampr\liha-tex\frontend\assets\liha-logo.png'

$tmp = "$dst.tmp.png"
[LogoKey]::Process($src, $dst, 700) | Write-Output
Move-Item $tmp $dst -Force
Get-Item $dst | Select-Object Name, Length | Format-Table -AutoSize
