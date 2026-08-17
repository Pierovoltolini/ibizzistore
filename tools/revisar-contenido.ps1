# Prepara todo el contenido de una carpeta para que Claude lo pueda revisar de una sola vez.
#
#   - Fotos  -> las junta en hojas de contacto de 12, con el nombre de archivo encima.
#   - Videos -> les saca 4 cuadros repartidos a lo largo del video y arma una fila por video.
#
# Asi en vez de abrir 55 archivos sueltos, se revisan ~6 hojas.
#
#   .\tools\revisar-contenido.ps1
#   .\tools\revisar-contenido.ps1 -Carpeta "otra carpeta" -PorHoja 16

param(
  [string]$Carpeta = "Fotos relojes contenido",
  [int]$PorHoja = 12,
  [int]$CuadrosPorVideo = 4
)

Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = "Stop"

$raiz = Split-Path -Parent $PSScriptRoot
if ([System.IO.Path]::IsPathRooted($Carpeta)) {
  $entrada = $Carpeta
} else {
  $entrada = Join-Path $raiz $Carpeta
}
if (-not (Test-Path $entrada)) { throw "No existe la carpeta: $entrada" }

$salida = Join-Path $entrada "_revision"
New-Item -ItemType Directory -Force $salida | Out-Null

$fotos = @(Get-ChildItem $entrada -File | Where-Object { $_.Extension -match '^\.(jpe?g|png|heic|webp)$' } | Sort-Object Name)
$videos = @(Get-ChildItem $entrada -File | Where-Object { $_.Extension -match '^\.(mov|mp4|m4v|avi)$' } | Sort-Object Name)
$stubs = @(Get-ChildItem $entrada -File -Filter *.url)

Write-Host "Carpeta : $entrada"
Write-Host "Fotos   : $($fotos.Count)"
Write-Host "Videos  : $($videos.Count)"
if ($stubs.Count -gt 0) {
  Write-Host ""
  Write-Host "OJO: hay $($stubs.Count) archivos .url (accesos directos a Drive, no el contenido real)." -ForegroundColor Yellow
  Write-Host "     Bajate los archivos de verdad y pisalos, si no no hay nada para revisar." -ForegroundColor Yellow
}

$ffmpeg = (Get-Command ffmpeg -ErrorAction SilentlyContinue).Source
$ffprobe = (Get-Command ffprobe -ErrorAction SilentlyContinue).Source
if ($videos.Count -gt 0 -and -not $ffmpeg) {
  Write-Host ""
  Write-Host "Falta ffmpeg, asi que los $($videos.Count) videos se saltean." -ForegroundColor Yellow
  Write-Host "Para instalarlo:  winget install Gyan.FFmpeg" -ForegroundColor Yellow
  Write-Host "(cerra y abri la terminal despues de instalar)" -ForegroundColor Yellow
}

# --- helpers -----------------------------------------------------------------

$codificador = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$calidad = New-Object System.Drawing.Imaging.EncoderParameters 1
$calidad.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 82

function New-HojaDeContacto {
  param(
    [string[]]$Rutas,
    [string[]]$Etiquetas,
    [int]$Columnas,
    [int]$AnchoCelda,
    [int]$AltoCelda,
    [string]$Destino
  )
  $filas = [math]::Ceiling($Rutas.Count / $Columnas)
  $ancho = $Columnas * $AnchoCelda
  $alto = $filas * $AltoCelda
  $hoja = New-Object System.Drawing.Bitmap $ancho, $alto
  $g = [System.Drawing.Graphics]::FromImage($hoja)
  $g.Clear([System.Drawing.Color]::FromArgb(18, 18, 20))
  $g.InterpolationMode = 'HighQualityBicubic'
  $fuente = New-Object System.Drawing.Font "Consolas", 13, ([System.Drawing.FontStyle]::Bold)

  for ($i = 0; $i -lt $Rutas.Count; $i++) {
    $col = $i % $Columnas
    $fila = [math]::Floor($i / $Columnas)
    try {
      $img = [System.Drawing.Image]::FromFile($Rutas[$i])
    } catch {
      continue
    }
    $escala = [math]::Min((($AnchoCelda - 12) / $img.Width), (($AltoCelda - 34) / $img.Height))
    $w = [int]($img.Width * $escala)
    $h = [int]($img.Height * $escala)
    $x = $col * $AnchoCelda + [int](($AnchoCelda - $w) / 2)
    $y = $fila * $AltoCelda + 26 + [int](($AltoCelda - 34 - $h) / 2)
    $g.DrawImage($img, $x, $y, $w, $h)
    $img.Dispose()
    $g.DrawString($Etiquetas[$i], $fuente, [System.Drawing.Brushes]::White, ($col * $AnchoCelda + 6), ($fila * $AltoCelda + 4))
  }
  $g.Dispose()
  $hoja.Save($Destino, $codificador, $calidad)
  $hoja.Dispose()
}

# --- fotos -------------------------------------------------------------------

$generadas = @()

if ($fotos.Count -gt 0) {
  $hoja = 0
  for ($i = 0; $i -lt $fotos.Count; $i += $PorHoja) {
    $hoja++
    $lote = $fotos[$i..([math]::Min($i + $PorHoja - 1, $fotos.Count - 1))]
    $destino = Join-Path $salida ("fotos-{0}.jpg" -f $hoja.ToString().PadLeft(2, '0'))
    New-HojaDeContacto -Rutas $lote.FullName -Etiquetas $lote.Name -Columnas 4 -AnchoCelda 330 -AltoCelda 420 -Destino $destino
    $generadas += $destino
    Write-Host "  hoja de fotos -> $(Split-Path -Leaf $destino)  ($($lote.Count) fotos)"
  }
}

# --- videos ------------------------------------------------------------------

if ($videos.Count -gt 0 -and $ffmpeg) {
  $tmp = Join-Path $salida "_cuadros"
  New-Item -ItemType Directory -Force $tmp | Out-Null
  $rutasCuadros = @()
  $etiquetasCuadros = @()

  foreach ($v in $videos) {
    $dur = 0.0
    if ($ffprobe) {
      $salidaDur = & $ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $v.FullName 2>$null
      [double]::TryParse($salidaDur, [ref]$dur) | Out-Null
    }
    if ($dur -le 0) { $dur = 8.0 }

    for ($k = 1; $k -le $CuadrosPorVideo; $k++) {
      $t = [math]::Round($dur * ($k / ($CuadrosPorVideo + 1.0)), 2)
      $destinoCuadro = Join-Path $tmp ("{0}_{1}.jpg" -f $v.BaseName, $k)
      & $ffmpeg -y -v error -ss $t -i $v.FullName -frames:v 1 -vf "scale=480:-1" $destinoCuadro 2>$null
      if (Test-Path $destinoCuadro) {
        $rutasCuadros += $destinoCuadro
        $etiquetasCuadros += ("{0} · {1}s" -f $v.BaseName, $t)
      }
    }
    Write-Host "  cuadros de $($v.Name)  (dur $([math]::Round($dur,1))s)"
  }

  # una fila por video: CuadrosPorVideo columnas
  $porHojaVideo = $CuadrosPorVideo * 3   # 3 videos por hoja
  $hoja = 0
  for ($i = 0; $i -lt $rutasCuadros.Count; $i += $porHojaVideo) {
    $hoja++
    $fin = [math]::Min($i + $porHojaVideo - 1, $rutasCuadros.Count - 1)
    $destino = Join-Path $salida ("videos-{0}.jpg" -f $hoja.ToString().PadLeft(2, '0'))
    New-HojaDeContacto -Rutas $rutasCuadros[$i..$fin] -Etiquetas $etiquetasCuadros[$i..$fin] -Columnas $CuadrosPorVideo -AnchoCelda 330 -AltoCelda 420 -Destino $destino
    $generadas += $destino
    Write-Host "  hoja de videos -> $(Split-Path -Leaf $destino)"
  }
}

Write-Host ""
Write-Host "Listo. $($generadas.Count) hojas en:"
Write-Host "  $salida"
Write-Host ""
Write-Host "Decile a Claude: 'revisa las hojas de $Carpeta/_revision'"
