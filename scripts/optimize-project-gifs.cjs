// Requires FFmpeg and ffprobe on PATH. Optional args: source directory, output directory.
// Run against full-size sources; re-encoding already optimized GIFs loses quality.
const {spawnSync} = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

function run(command, args) {
  const result = spawnSync(command, args, {encoding: 'utf8', windowsHide: true, maxBuffer: 4 * 1024 * 1024});
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error(`${command}: ${result.stderr}`);
  return result.stdout;
}

function probe(file) {
  const data = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,nb_frames:format=duration,size', '-of', 'json', file]));
  const stream = data.streams[0];
  return {width: stream.width, height: stream.height, frames: Number(stream.nb_frames), duration: Number(data.format.duration), bytes: Number(data.format.size)};
}

(async () => {
  const source = path.resolve(process.argv[2] || 'public/project-gifs');
  const output = path.resolve(process.argv[3] || 'public/project-gifs');
  const names = (await fs.readdir(source)).filter(name => /\.gif$/i.test(name)).sort();
  if (!names.length) throw Error(`No GIFs found in ${source}`);
  const staging = await fs.mkdtemp(path.join(os.tmpdir(), 'arcade-optimized-gifs-'));
  const results = [];
  for (const name of names) {
    const input = path.join(source, name);
    const target = path.join(staging, name);
    const before = probe(input);
    const fps = Math.min(8, Math.floor(before.frames / before.duration));
    const filter = `fps=${fps},scale=w='min(256,iw)':h='min(256,ih)':force_original_aspect_ratio=decrease:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle`;
    run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-filter_complex_threads', '1', '-filter_complex', filter, '-loop', '0', target]);
    const after = probe(target);
    if (after.bytes >= before.bytes || after.frames < 2 || Math.abs(after.duration - before.duration) > 0.2) {
      throw Error(`Size, animation or duration check failed for ${name}`);
    }
    const bytes = await fs.readFile(target);
    const loop = bytes.indexOf(Buffer.from('NETSCAPE2.0'));
    if (loop < 0 || bytes.readUInt16LE(loop + 13) !== 0) throw Error(`Infinite loop missing in ${name}`);
    // Decode every frame before replacing a source file.
    run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-xerror', '-i', target, '-f', 'null', '-']);
    results.push({file: name, fps, before, after, reductionPercent: Number((100 * (1 - after.bytes / before.bytes)).toFixed(1))});
    console.log(`${name}: ${(before.bytes / 1e6).toFixed(2)} MB -> ${(after.bytes / 1e6).toFixed(2)} MB`);
  }
  // Keep full-size sources outside public so they are excluded from the site build.
  const backup = await fs.mkdtemp(path.join(os.tmpdir(), 'arcade-gif-originals-'));
  for (const name of names) await fs.copyFile(path.join(source, name), path.join(backup, name));
  await fs.mkdir(output, {recursive: true});
  for (const name of names) await fs.copyFile(path.join(staging, name), path.join(output, name));
  const originalBytes = results.reduce((total, file) => total + file.before.bytes, 0);
  const optimizedBytes = results.reduce((total, file) => total + file.after.bytes, 0);
  const report = {maxDimension: 256, maxFps: 8, paletteColors: 128, dither: 'none', originalBytes, optimizedBytes, reductionPercent: Number((100 * (1 - optimizedBytes / originalBytes)).toFixed(1)), files: results};
  await fs.writeFile('design/arcade-menu/gif-optimization.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({originalBytes, optimizedBytes, reductionPercent: report.reductionPercent, originalsBackup: backup}));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
