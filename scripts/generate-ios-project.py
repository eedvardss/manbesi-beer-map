#!/usr/bin/env python3
"""Generate a dependency-free Xcode project with automatic source discovery."""
from pathlib import Path
import hashlib
import json

root = Path(__file__).resolve().parents[1] / "ios"
project = root / "BeerMap.xcodeproj"
project.mkdir(parents=True, exist_ok=True)

def uid(name):
    return hashlib.sha1(name.encode()).hexdigest()[:24].upper()

def q(value):
    return json.dumps(value)

objects = {}
def add(name, contents):
    objects[uid(name)] = contents
    return uid(name)

products = []
groups = []
targets = []
for name, suffix, product_type in [
    ("BeerMap", "app", "com.apple.product-type.application"),
    ("BeerMapTests", "xctest", "com.apple.product-type.bundle.unit-test"),
    ("BeerMapUITests", "xctest", "com.apple.product-type.bundle.ui-testing"),
]:
    exceptions = ""
    if name == "BeerMap":
        exception = add("InfoException", f"isa = PBXFileSystemSynchronizedBuildFileExceptionSet; membershipExceptions = (Info.plist,); target = {uid(name + 'Target')};")
        exceptions = f"exceptions = ({exception},);"
    group = add(name + "Group", f"isa = PBXFileSystemSynchronizedRootGroup; {exceptions} path = {name}; sourceTree = \"<group>\";")
    groups.append(group)
    product = add(name + "Product", f"isa = PBXFileReference; explicitFileType = {'wrapper.application' if suffix == 'app' else 'wrapper.cfbundle'}; includeInIndex = 0; path = {name}.{suffix}; sourceTree = BUILT_PRODUCTS_DIR;")
    products.append(product)
    phases = []
    for phase in ["Sources", "Frameworks", "Resources"]:
        phases.append(add(name + phase, f"isa = PBX{phase}BuildPhase; buildActionMask = 2147483647; files = (); runOnlyForDeploymentPostprocessing = 0;"))
    configs = []
    for configuration in ["Debug", "Release"]:
        settings = {
            "PRODUCT_NAME": "$(TARGET_NAME)", "PRODUCT_BUNDLE_IDENTIFIER": "lv.manbesi." + name,
            "IPHONEOS_DEPLOYMENT_TARGET": "26.0", "SDKROOT": "iphoneos", "SUPPORTED_PLATFORMS": "iphoneos iphonesimulator",
            "TARGETED_DEVICE_FAMILY": "1", "SWIFT_VERSION": "6.0", "CODE_SIGN_STYLE": "Automatic",
            "GENERATE_INFOPLIST_FILE": "YES", "SWIFT_STRICT_CONCURRENCY": "complete",
            "SWIFT_OPTIMIZATION_LEVEL": "-Onone" if configuration == "Debug" else "-O",
            "DEBUG_INFORMATION_FORMAT": "dwarf" if configuration == "Debug" else "dwarf-with-dsym",
        }
        if name == "BeerMap":
            settings.update({"INFOPLIST_FILE": "BeerMap/Info.plist", "ASSETCATALOG_COMPILER_APPICON_NAME": "AppIcon", "INFOPLIST_KEY_UIApplicationSceneManifest_Generation": "YES", "ENABLE_PREVIEWS": "YES"})
        elif name == "BeerMapTests":
            settings.update({"TEST_HOST": "$(BUILT_PRODUCTS_DIR)/BeerMap.app/$(BUNDLE_EXECUTABLE_FOLDER_PATH)/BeerMap", "BUNDLE_LOADER": "$(TEST_HOST)"})
        else:
            settings["TEST_TARGET_NAME"] = "BeerMap"
        configs.append(add(name + configuration, "isa = XCBuildConfiguration; name = " + configuration + "; buildSettings = {" + " ".join(f"{key} = {q(value)};" for key, value in settings.items()) + "};"))
    config_list = add(name + "Configs", f"isa = XCConfigurationList; buildConfigurations = ({','.join(configs)},); defaultConfigurationIsVisible = 0; defaultConfigurationName = Release;")
    dependencies = []
    if name != "BeerMap":
        proxy = add(name + "Proxy", f"isa = PBXContainerItemProxy; containerPortal = {uid('Project')}; proxyType = 1; remoteGlobalIDString = {uid('BeerMapTarget')}; remoteInfo = BeerMap;")
        dependencies.append(add(name + "Dependency", f"isa = PBXTargetDependency; target = {uid('BeerMapTarget')}; targetProxy = {proxy};"))
    targets.append(add(name + "Target", f"isa = PBXNativeTarget; buildConfigurationList = {config_list}; buildPhases = ({','.join(phases)},); buildRules = (); dependencies = ({','.join(dependencies)}); fileSystemSynchronizedGroups = ({group},); name = {name}; productName = {name}; productReference = {product}; productType = {q(product_type)};"))

products_group = add("Products", f"isa = PBXGroup; children = ({','.join(products)},); name = Products; sourceTree = \"<group>\";")
main_group = add("MainGroup", f"isa = PBXGroup; children = ({','.join(groups + [products_group])},); sourceTree = \"<group>\";")
project_configs = []
for configuration in ["Debug", "Release"]:
    project_configs.append(add("Project" + configuration, f"isa = XCBuildConfiguration; name = {configuration}; buildSettings = {{ CLANG_ENABLE_MODULES = YES; CLANG_ENABLE_OBJC_ARC = YES; ENABLE_TESTABILITY = {'YES' if configuration == 'Debug' else 'NO'}; SWIFT_ACTIVE_COMPILATION_CONDITIONS = {'DEBUG' if configuration == 'Debug' else q('')}; }};"))
project_config_list = add("ProjectConfigs", f"isa = XCConfigurationList; buildConfigurations = ({','.join(project_configs)},); defaultConfigurationIsVisible = 0; defaultConfigurationName = Release;")
add("Project", f"isa = PBXProject; attributes = {{ BuildIndependentTargetsInParallel = YES; LastUpgradeCheck = 2660; }}; buildConfigurationList = {project_config_list}; compatibilityVersion = \"Xcode 16.0\"; developmentRegion = lv; hasScannedForEncodings = 0; knownRegions = (lv,en,Base,); mainGroup = {main_group}; productRefGroup = {products_group}; projectDirPath = \"\"; projectRoot = \"\"; targets = ({','.join(targets)},);")
(project / "project.pbxproj").write_text("// !$*UTF8*$!\n{ archiveVersion = 1; classes = {}; objectVersion = 77; objects = {\n" + "\n".join(f"{key} = {{ {contents} }};" for key, contents in objects.items()) + f"\n}}; rootObject = {uid('Project')}; }}\n")

def reference(name):
    return f'<BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{uid(name + "Target")}" BuildableName="{name}.{"app" if name == "BeerMap" else "xctest"}" BlueprintName="{name}" ReferencedContainer="container:BeerMap.xcodeproj"/>'
scheme_dir = project / "xcshareddata" / "xcschemes"
scheme_dir.mkdir(parents=True, exist_ok=True)
(scheme_dir / "BeerMap.xcscheme").write_text(f'''<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="2660" version="1.7">
<BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES"><BuildActionEntries>
<BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES">{reference("BeerMap")}</BuildActionEntry>
</BuildActionEntries></BuildAction>
<TestAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" shouldUseLaunchSchemeArgsEnv="YES"><Testables>
<TestableReference skipped="NO" parallelizable="NO">{reference("BeerMapTests")}</TestableReference>
<TestableReference skipped="NO" parallelizable="NO">{reference("BeerMapUITests")}</TestableReference>
</Testables></TestAction>
<LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="NO" debugDocumentVersioning="YES" debugServiceExtension="internal" allowLocationSimulation="YES"><BuildableProductRunnable runnableDebuggingMode="0">{reference("BeerMap")}</BuildableProductRunnable></LaunchAction>
<ProfileAction buildConfiguration="Release" shouldUseLaunchSchemeArgsEnv="YES" savedToolIdentifier="" useCustomWorkingDirectory="NO" debugDocumentVersioning="YES"><BuildableProductRunnable runnableDebuggingMode="0">{reference("BeerMap")}</BuildableProductRunnable></ProfileAction>
<AnalyzeAction buildConfiguration="Debug"/>
<ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="YES"/>
</Scheme>''')
print(project)
