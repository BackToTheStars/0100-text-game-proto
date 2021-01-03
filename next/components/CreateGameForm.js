const CreateGameForm = ({setToggleCreateForm}) => {

    return (
        <form>
            <div className="form-group">
                <div className="form-check">
                    <input name="public" type="checkbox" className="form-check-input" />
                    <label className="form-check-label">public</label>
                </div>
            </div>
            <div className="form-group">
                <label>Name</label>
                <input className="form-control" name="name" type="text" value="" />
            </div>
            <button type="submit" className="btn btn-primary">Create</button>
            <button className="btn btn-link"
                onClick={() => { setToggleCreateForm(false) }}
            >Cancel</button>
        </form>
    );
}

export default CreateGameForm
