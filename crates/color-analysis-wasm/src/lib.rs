use serde::Serialize;
use wasm_bindgen::prelude::*;

#[derive(Clone, Serialize)]
struct ColorCount {
    r: u8,
    g: u8,
    b: u8,
    hex: String,
    count: u32,
    ratio: f32,
    hue: f32,
    hue_angle: f32,
    hsl_saturation: f32,
    lightness: f32,
    hsv_saturation: f32,
    value: f32,
}

#[derive(Serialize)]
struct AnalysisResult {
    width: u32,
    height: u32,
    total_pixels: u32,
    colors: Vec<ColorCount>,
    colors01: Vec<ColorCount>,
}

#[derive(Clone, Copy, Default)]
struct Bin {
    count: u32,
    sum_r: u64,
    sum_g: u64,
    sum_b: u64,
}

#[derive(Clone)]
struct Candidate {
    r: u8,
    g: u8,
    b: u8,
    count: u32,
    ratio: f32,
}

struct Cluster {
    sum_r: f32,
    sum_g: f32,
    sum_b: f32,
    weight: f32,
    count: u32,
    hits: u32,
}

fn levels(step: u8) -> usize {
    (256usize + step as usize - 1) / step as usize
}

fn index(r: u8, g: u8, b: u8, step: u8, levels: usize) -> usize {
    let r = (r / step) as usize;
    let g = (g / step) as usize;
    let b = (b / step) as usize;
    (r * levels + g) * levels + b
}

fn rgb_to_hsl_hsv(r: u8, g: u8, b: u8) -> (f32, f32, f32, f32, f32) {
    let r = r as f32 / 255.0;
    let g = g as f32 / 255.0;
    let b = b as f32 / 255.0;
    let max = r.max(g).max(b);
    let min = r.min(g).min(b);
    let delta = max - min;
    let lightness = (max + min) / 2.0;
    let hue = if delta == 0.0 {
        0.0
    } else if max == r {
        60.0 * ((g - b) / delta).rem_euclid(6.0)
    } else if max == g {
        60.0 * ((b - r) / delta + 2.0)
    } else {
        60.0 * ((r - g) / delta + 4.0)
    };
    let hsl_saturation = if delta == 0.0 { 0.0 } else { delta / (1.0 - (2.0 * lightness - 1.0).abs()) };
    let hsv_saturation = if max == 0.0 { 0.0 } else { delta / max };
    (hue, hsl_saturation, lightness, hsv_saturation, max)
}

fn color_count(r: u8, g: u8, b: u8, count: u32, ratio: f32) -> ColorCount {
    let (hue, hsl_saturation, lightness, hsv_saturation, value) = rgb_to_hsl_hsv(r, g, b);
    ColorCount {
        r,
        g,
        b,
        hex: format!("#{r:02x}{g:02x}{b:02x}"),
        count,
        ratio,
        hue,
        hue_angle: hue,
        hsl_saturation,
        lightness,
        hsv_saturation,
        value,
    }
}

fn top_candidates(bins: &[u32], step: u8, limit: usize, total: u32) -> Vec<Candidate> {
    let level_count = levels(step);
    let mut items: Vec<(usize, u32)> = bins.iter().copied().enumerate().filter(|(_, count)| *count > 0).collect();
    items.sort_unstable_by(|a, b| b.1.cmp(&a.1));
    items.truncate(limit);
    items.into_iter().map(|(bin, count)| {
        let b = bin % level_count;
        let g = (bin / level_count) % level_count;
        let r = bin / (level_count * level_count);
        Candidate {
            r: (r * step as usize).min(255) as u8,
            g: (g * step as usize).min(255) as u8,
            b: (b * step as usize).min(255) as u8,
            count,
            ratio: if total == 0 { 0.0 } else { count as f32 / total as f32 },
        }
    }).collect()
}

fn distance(candidate: &Candidate, cluster: &Cluster) -> f32 {
    let r = cluster.sum_r / cluster.weight;
    let g = cluster.sum_g / cluster.weight;
    let b = cluster.sum_b / cluster.weight;
    let dr = candidate.r as f32 - r;
    let dg = candidate.g as f32 - g;
    let db = candidate.b as f32 - b;
    (dr * dr + dg * dg + db * db).sqrt()
}

fn build_palette(cell_bins: Vec<Vec<u32>>, cell_totals: Vec<u32>) -> Vec<ColorCount> {
    let mut clusters: Vec<Cluster> = Vec::new();
    for (bins, total) in cell_bins.iter().zip(cell_totals) {
        for candidate in top_candidates(bins, 16, 3, total) {
            let weight = candidate.ratio * 100.0 + (candidate.count as f32).sqrt();
            if let Some(cluster) = clusters.iter_mut().find(|cluster| distance(&candidate, cluster) <= 22.0) {
                cluster.sum_r += candidate.r as f32 * weight;
                cluster.sum_g += candidate.g as f32 * weight;
                cluster.sum_b += candidate.b as f32 * weight;
                cluster.weight += weight;
                cluster.count += candidate.count;
                cluster.hits += 1;
            } else {
                clusters.push(Cluster {
                    sum_r: candidate.r as f32 * weight,
                    sum_g: candidate.g as f32 * weight,
                    sum_b: candidate.b as f32 * weight,
                    weight,
                    count: candidate.count,
                    hits: 1,
                });
            }
        }
    }
    let total_score: f32 = clusters.iter().map(|cluster| cluster.weight + cluster.hits as f32 * 8.0).sum();
    let mut palette: Vec<ColorCount> = clusters.into_iter().map(|cluster| {
        let score = cluster.weight + cluster.hits as f32 * 8.0;
        color_count(
            (cluster.sum_r / cluster.weight).round() as u8,
            (cluster.sum_g / cluster.weight).round() as u8,
            (cluster.sum_b / cluster.weight).round() as u8,
            cluster.count,
            if total_score == 0.0 { 0.0 } else { score / total_score },
        )
    }).collect();
    palette.sort_unstable_by(|a, b| b.count.cmp(&a.count));
    palette.truncate(20);
    palette
}

#[wasm_bindgen]
pub fn analyze_rgba(data: &[u8], width: u32, height: u32, quantize_step: u8, top_n: usize) -> String {
    let step = quantize_step.max(1);
    let main_levels = levels(step);
    let mut main_bins = vec![Bin::default(); main_levels * main_levels * main_levels];
    let palette_levels = levels(16);
    let mut cell_bins = vec![vec![0u32; palette_levels * palette_levels * palette_levels]; 64];
    let mut cell_totals = vec![0u32; 64];
    let mut total_pixels = 0u32;

    for (pixel_index, rgba) in data.chunks_exact(4).enumerate() {
        let [r, g, b, a] = [rgba[0], rgba[1], rgba[2], rgba[3]];
        if a == 0 { continue; }
        total_pixels += 1;
        let bin = &mut main_bins[index(r, g, b, step, main_levels)];
        bin.count += 1;
        bin.sum_r += r as u64;
        bin.sum_g += g as u64;
        bin.sum_b += b as u64;

        let x = (pixel_index as u32) % width.max(1);
        let y = (pixel_index as u32) / width.max(1);
        let cell_x = ((x as u64 * 8) / width.max(1) as u64).min(7) as usize;
        let cell_y = ((y as u64 * 8) / height.max(1) as u64).min(7) as usize;
        let cell = cell_y * 8 + cell_x;
        cell_bins[cell][index(r, g, b, 16, palette_levels)] += 1;
        cell_totals[cell] += 1;
    }

    let mut colors: Vec<ColorCount> = main_bins.into_iter().filter(|bin| bin.count > 0).map(|bin| {
        color_count(
            (bin.sum_r / bin.count as u64) as u8,
            (bin.sum_g / bin.count as u64) as u8,
            (bin.sum_b / bin.count as u64) as u8,
            bin.count,
            if total_pixels == 0 { 0.0 } else { bin.count as f32 / total_pixels as f32 },
        )
    }).collect();
    colors.sort_unstable_by(|a, b| b.count.cmp(&a.count));
    colors.truncate(top_n);

    serde_json::to_string(&AnalysisResult {
        width,
        height,
        total_pixels,
        colors,
        colors01: build_palette(cell_bins, cell_totals),
    }).unwrap_or_else(|_| "{\"width\":0,\"height\":0,\"total_pixels\":0,\"colors\":[],\"colors01\":[]}".to_string())
}
