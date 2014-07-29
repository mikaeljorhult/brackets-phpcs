define( function( require, exports, module ) {
	'use strict';
	
	// Get module dependencies.
	var CodeInspection = brackets.getModule( 'language/CodeInspection' ),
		DocumentManager = brackets.getModule( 'document/DocumentManager' ),
		EditorManager = brackets.getModule( 'editor/EditorManager' ),
		ExtensionUtils = brackets.getModule( 'utils/ExtensionUtils' ),
		PreferencesManager = brackets.getModule( 'preferences/PreferencesManager' ),
		
		// Extension Modules.
		CommandRunner = require( 'modules/CommandRunner' ),
		Events = require( 'modules/Events' ),
		Parsers = require( 'modules/Parsers' ),
		
		// Setup extension.
		preferences = PreferencesManager.getExtensionPrefs( 'mikaeljorhult.bracketsPHPLintTools' ),
		
		// Variables.
		basePath = ExtensionUtils.getModulePath( module, 'vendor/' ).replace( ' ', '\\ ' ),
		paths = {
			phpcpd: 'php ' + basePath + 'phpcpd/phpcpd.phar',
			phpcs: 'php ' + basePath + 'phpcs/phpcs.phar',
			phpl: 'php',
			phpmd: 'php ' + basePath + 'phpmd/phpmd.phar'
		};
	
	// Lint path and return found errors.
	function getErrors( fullPath ) {
		var filePath = normalizePath( fullPath ),
			phpcsStandards = concatenateArray( preferences.get( 'phpcs-standards' ), ' --standard=' ),
			phpmdRulesets = concatenateArray( preferences.get( 'phpmd-rulesets' ) ),
			
			// Commands.
			phpcpdCommand = paths.phpcpd + ' ' + filePath,
			phpcsCommand = paths.phpcs + phpcsStandards + ' ' + filePath,
			phplCommand = paths.phpl + ' -d display_errors=1 -d error_reporting=-1 -l ' + filePath,
			phpmdCommand = paths.phpmd + ' ' + filePath + ' text ' + phpmdRulesets;
		
		// Pass command to parser.
		Parsers.run( {
			name: 'phpcs',
			command: phpcsCommand
		} );
		
		Parsers.run( {
			name: 'phpcpd',
			command: phpcpdCommand
		} );
		
		Parsers.run( {
			name: 'phpl',
			command: phplCommand
		} );
		
		Parsers.run( {
			name: 'phpmd',
			command: phpmdCommand
		} );
	}
	
	// Concatenate a array of values to a comma separated string.
	function concatenateArray( valueArray, prefix ) {
		var returnValue = false;
		
		if ( valueArray.length > 0 ) {
			returnValue = ( prefix !== undefined ? prefix : '' ) + valueArray.join( ',' );
		}
		
		return returnValue;
	}
	
	
	// Escape paths on different systems.
	function normalizePath( fullPath ) {
		if ( brackets.platform === 'win' ) {
			fullPath = '"' + fullPath + '"';
		} else {
			fullPath = fullPath.replace( new RegExp( ' ', 'g' ), '\\ ' );
		}
		
		return fullPath;
	}
	
	// Register event listeners.
	function registerEvents() {
		// Test for PHP.
		CommandRunner.run( 'php -v', function( data ) {
			var phpAvailable = data.indexOf( 'PHP' ) > -1;
			
			// Save PHP state
			preferences.set( 'php-available', phpAvailable );
			preferences.save();
			
			// Only register linters and listeners if PHP is available on machine.
			if ( phpAvailable ) {
				// Register linting service.
				CodeInspection.register( 'php', {
					name: 'PHP Copy/Paste Detector',
					scanFile: function() {
						return {
							errors: Parsers.errors().phpcpd
						};
					}
				} );
				
				CodeInspection.register( 'php', {
					name: 'PHP CodeSniffer',
					scanFile: function() {
						return {
							errors: Parsers.errors().phpcs
						};
					}
				} );
				
				CodeInspection.register( 'php', {
					name: 'PHP Lint',
					scanFile: function() {
						return {
							errors: Parsers.errors().phpl
						};
					}
				} );
				
				CodeInspection.register( 'php', {
					name: 'PHP Mess Detector',
					scanFile: function() {
						return {
							errors: Parsers.errors().phpmd
						};
					}
				} );
				
				// Run CodeInspection when a file is saved or other file get focus.
				$( DocumentManager ).on( 'documentSaved.phpLintTools', function( event, fileEntry ) {
					getErrors( fileEntry.file.fullPath );
				} );
				
				$( EditorManager ).on( 'activeEditorChange', function( event, editor ) {
					getErrors( editor.document.file.fullPath );
				} );
			}
		} );
	}
	
	// Register event listeners.
	if ( CommandRunner.initialized() ) {
		registerEvents();
	} else {
		Events.subscribe( 'node:connected', registerEvents );
	}
} );