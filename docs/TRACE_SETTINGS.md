# Trace Settings for Public Trace Visibility

Public trace pages (QR scan) are shown only when `trace_status = 'published'`. The visibility of trace data is controlled by the `trace_settings` JSONB column on `listings`.

## trace_settings Keys

| Key | Type | Description |
|-----|------|-------------|
| `show_origin_level` | `'district'` \| `'district_village'` | Origin detail level: district only, or district + village |
| `show_crop_details` | boolean | Show crop name, variety, and related details |
| `show_crop_timeline` | boolean | Show sowing, growth, harvest timeline |
| `show_stage_photos` | boolean | Show stage/growth photos on the QR page |
| `show_input_photos` | boolean | Show input/fertilizer photos on the QR page |
| `show_soil_report` | boolean | Show soil test report on the QR page |
| `show_geo_proof` | boolean | Show geo verification badge |

## Default Values

```json
{
  "show_origin_level": "district",
  "show_crop_details": true,
  "show_crop_timeline": true,
  "show_stage_photos": false,
  "show_input_photos": false,
  "show_soil_report": false,
  "show_geo_proof": false
}
```

## Usage

- **Farmer UI**: `TraceSettingsPanel` in `src/components/listings/TraceSettingsPanel.tsx` lets farmers configure these when creating/editing listings.
- **Public trace**: The `public-listing-trace` Edge Function (or equivalent) should respect these flags when rendering the public trace page.
- **trace_code**: Auto-generated on listing insert (e.g. `AGN-LST-YYYY-NNNN`). Used in QR codes and public trace URLs.
