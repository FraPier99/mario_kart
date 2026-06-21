$baseUrl = "https://www.spriters-resource.com/media/assets"
$circuitsDir = "frontend/src/assets/images/mkds/circuits"
$itemsDir = "frontend/src/assets/images/mkds/items"

$circuits = @(
    @{id=44379; folder=41; file="figure-8-circuit.png"}
    @{id=44372; folder=41; file="yoshi-falls.png"}
    @{id=44373; folder=41; file="cheep-cheep-beach.png"}
    @{id=44377; folder=41; file="luigis-mansion.png"}
    @{id=44375; folder=41; file="desert-hills.png"}
    @{id=44374; folder=41; file="delfino-square.png"}
    @{id=44378; folder=41; file="waluigi-pinball.png"}
    @{id=44376; folder=41; file="shroom-ridge.png"}
    @{id=53403; folder=50; file="dk-pass.png"}
    @{id=142020; folder=139; file="tick-tock-clock.png"}
    @{id=53413; folder=50; file="mario-circuit.png"}
    @{id=53409; folder=50; file="airship-fortress.png"}
    @{id=53402; folder=50; file="wario-stadium.png"}
    @{id=53410; folder=50; file="peach-gardens.png"}
    @{id=142037; folder=139; file="bowser-castle.png"}
    @{id=53414; folder=50; file="rainbow-road.png"}
    @{id=44382; folder=41; file="mario-circuit-1.png"}
    @{id=44383; folder=41; file="moo-moo-farm.png"}
    @{id=44380; folder=41; file="peach-circuit.png"}
    @{id=44381; folder=41; file="luigi-circuit-gcn.png"}
    @{id=44393; folder=41; file="donut-plains-1.png"}
    @{id=44392; folder=41; file="frappe-snowland.png"}
    @{id=44390; folder=41; file="bowser-castle-2.png"}
    @{id=44391; folder=41; file="baby-park.png"}
    @{id=53405; folder=50; file="koopa-beach-2.png"}
    @{id=53412; folder=50; file="choco-mountain.png"}
    @{id=53407; folder=50; file="luigi-circuit-gba.png"}
    @{id=53408; folder=50; file="mushroom-bridge.png"}
    @{id=53415; folder=50; file="choco-island-2.png"}
    @{id=53411; folder=50; file="banshee-boardwalk.png"}
    @{id=53404; folder=50; file="sky-garden.png"}
    @{id=53406; folder=50; file="yoshi-circuit.png"}
)

Write-Host "=== Downloading 32 Race Course Maps ===" -ForegroundColor Cyan
$ok = 0; $fail = 0
foreach ($c in $circuits) {
    $url = "$baseUrl/$($c.folder)/$($c.id).png"
    $out = Join-Path $circuitsDir $c.file
    Write-Host "  [$($c.file)]..." -NoNewline
    try {
        Invoke-WebRequest -Uri $url -OutFile $out -ErrorAction Stop
        Write-Host " OK" -ForegroundColor Green
        $ok++
    } catch {
        Write-Host " FAIL ($_)" -ForegroundColor Red
        $fail++
    }
}

Write-Host "`n=== Downloading Items sprite ===" -ForegroundColor Cyan
$itemsUrl = "$baseUrl/24/26346.gif"
$itemsOut = Join-Path $itemsDir "items.gif"
Write-Host "  [items.gif]..." -NoNewline
try {
    Invoke-WebRequest -Uri $itemsUrl -OutFile $itemsOut -ErrorAction Stop
    Write-Host " OK" -ForegroundColor Green
    $ok++
} catch {
    Write-Host " FAIL ($_)" -ForegroundColor Red
    $fail++
}

Write-Host "`n=== Done: $ok downloaded, $fail failed ===" -ForegroundColor Cyan
