import { UITabbedPanel, UISpan, UIButton } from './libs/ui.js';

import { SidebarScene } from './Sidebar.Scene.js';
import { SidebarProperties } from './Sidebar.Properties.js';
import { SidebarProject } from './Sidebar.Project.js';
import { SidebarSettings } from './Sidebar.Settings.js';

function Sidebar( editor ) {

	const strings = editor.strings;

	const container = new UITabbedPanel();
	container.setId( 'sidebar' );

	const initialCollapsed = editor.config.getKey( 'ui/sidebarCollapsed' ) === true;

	function applyCollapsed( collapsed ) {
		const dom = container.dom;
		if ( collapsed ) {
			dom.classList.add( 'collapsed' );
		} else {
			dom.classList.remove( 'collapsed' );
		}

		document.getElementById( 'viewport' ).style.right = 0;

		editor.config.setKey( 'ui/sidebarCollapsed', collapsed );
		editor.signals.windowResize.dispatch();
		editor.signals.refreshSidebarEnvironment.dispatch();
	}

	const toggle = new UIButton( '▶' );
	toggle.dom.id = 'sidebar-toggle';
	toggle.onClick( function () {
		const collapsed = !container.dom.classList.contains( 'collapsed' );
		applyCollapsed( collapsed );
	} );
	container.dom.appendChild( toggle.dom );

	const sidebarProperties = new SidebarProperties( editor );

	const scene = new UISpan().add(
		new SidebarScene( editor ),
		sidebarProperties
	);
	const project = new SidebarProject( editor );
	const settings = new SidebarSettings( editor );

	container.addTab( 'scene', strings.getKey( 'sidebar/scene' ), scene );
	container.addTab( 'project', strings.getKey( 'sidebar/project' ), project );
	container.addTab( 'settings', strings.getKey( 'sidebar/settings' ), settings );
	container.select( 'scene' );

	const sidebarPropertiesResizeObserver = new ResizeObserver( function () {

		sidebarProperties.tabsDiv.setWidth( getComputedStyle( container.dom ).width );

	} );

	sidebarPropertiesResizeObserver.observe( container.tabsDiv.dom );

	return container;

}

export { Sidebar };
