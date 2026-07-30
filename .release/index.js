module.exports = {
  branches: [
    { name: 'master', prerelease: false },
    { name: 'next', prerelease: true },
    { name: 'legacy/v2', range: '2.x.x' },
  ],
  plugins: [
    require('./commit-analyzer'),
    require('./release-notes'),
    require('./changelog'),
    require('./npm-publish'),
    require('./git'),
    require('./github'),
  ],
};
