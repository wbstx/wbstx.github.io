import { UIPanel, UIRow } from './libs/ui.js';

import { MenubarAdd } from './Menubar.Add.js';
import { MenubarEdit } from './Menubar.Edit.js';
import { MenubarFile } from './Menubar.File.js';
import { MenubarView } from './Menubar.View.js';
import { MenubarHelp } from './Menubar.Help.js';
import { MenubarStatus } from './Menubar.Status.js';
import { LoadingManager } from '../../build/three.core.js';

function Menubar( editor ) {

	const container = new UIPanel();
	container.setId( 'menubar' );

	container.add( new MenubarFile( editor ) );
	container.add( new MenubarEdit( editor ) );
	container.add( new MenubarAdd( editor ) );
	container.add( new MenubarView( editor ) );
	// container.add( new MenubarHelp( editor ) );

	// container.add( new MenubarStatus( editor ) );

	editor.signals.cameraAdded.add( update );
	editor.signals.cameraRemoved.add( update );
	editor.signals.objectChanged.add( function ( object ) {
		if ( object.isCamera ) {
			update();
		}
	} );
	update();

	function update() {
		const cameraContainer = new UIPanel();
		cameraContainer.setClass( 'menu' );
		const cameras = editor.cameras;
		for ( const key in cameras ) {
			const camera = cameras[ key ];

			let option = new UIRow();
			option.setClass( 'option' );
			option.setTextContent( camera.name );
			option.onClick( function () {
				editor.setViewportCamera( camera.uuid );
			} );
			cameraContainer.add( option );
		}
		container.removeLastChild();
		container.add( cameraContainer );
	}

	return container;

}

export { Menubar };
