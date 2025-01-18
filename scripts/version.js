const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

function getLatestGitTag() {
    try {
        // Get the latest tag
        const tag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
        return tag.replace('v', '');
    } catch (error) {
        // If no tags exist, return default version
        return '0.1.0';
    }
}

function incrementVersion(version, type = 'patch') {
    const [major, minor, patch] = version.split('.').map(Number);
    
    switch (type) {
        case 'major':
            return `${major + 1}.0.0`;
        case 'minor':
            return `${major}.${minor + 1}.0`;
        case 'patch':
        default:
            return `${major}.${minor}.${patch + 1}`;
    }
}

function updatePackageVersion() {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = require(packageJsonPath);
    
    // Get current version from Git tags
    const currentVersion = getLatestGitTag();
    
    // Increment the version
    const newVersion = incrementVersion(currentVersion, process.argv[2]);
    
    // Update package.json
    packageJson.version = newVersion;
    
    // Write back to package.json
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    
    // Create a new Git tag
    try {
        execSync(`git tag v${newVersion}`);
        console.log(`Created new version: ${newVersion}`);
    } catch (error) {
        console.error('Error creating Git tag:', error.message);
    }
    
    return newVersion;
}

// Run the version update
updatePackageVersion(); 