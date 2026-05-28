$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$outputPath = "c:\Users\ting_hsia\.gemini\antigravity\scratch\billing-manager\vba_code.txt"
$log = ""

try {
    $wb = $excel.Workbooks.Open("c:\Users\ting_hsia\.gemini\antigravity\scratch\billing-manager\vba\信用卡明細彙整表_解答.xlsm")
    $project = $wb.VBProject
    $log += "VBA Project found. Components: " + $project.VBComponents.Count + "`n"
    foreach ($comp in $project.VBComponents) {
        $name = $comp.Name
        $log += "=========================================`n"
        $log += "Component: $name (Type: " + $comp.Type + ")`n"
        $log += "=========================================`n"
        $count = $comp.CodeModule.CountOfLines
        if ($count -gt 0) {
            $code = $comp.CodeModule.Lines(1, $count)
            $log += $code + "`n"
        } else {
            $log += "[No code]`n"
        }
    }
} catch {
    $log += "ERROR: " + $_.Exception.Message + "`n"
    $log += "If error is 'Programmatic access to Visual Basic Project is not trusted', you need to enable it in Excel Options -> Trust Center -> Trust Center Settings -> Macro Settings -> Trust access to the VBA project object model.`n"
} finally {
    if ($wb) { $wb.Close($false) }
    $excel.Quit()
}

$log | Out-File -FilePath $outputPath -Encoding utf8
Write-Host "VBA extraction complete. Log written to vba_code.txt"
